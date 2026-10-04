/**
 * Local persistence for queued learning events. Uses IndexedDB (events can
 * accumulate across long offline sessions, which localStorage handles
 * poorly) with an in-memory fallback so a learner on a browser without
 * IndexedDB support still gets working gameplay — they simply won't have
 * events survive a reload.
 *
 * Decides which backend to use once, at module load, the same way
 * `game/persistence.ts` picks between localStorage and an in-memory store.
 */
import type { EventSyncStatus, LearningEvent, LearningEventStore, QueuedLearningEvent } from './types';
import { computeNextAttemptAt, isDue } from './eventQueue';
import { logLearning } from './logger';

const DB_NAME = 'forest-spelling-learning';
const DB_VERSION = 1;
const STORE_NAME = 'events';

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function newQueuedEvent(event: LearningEvent): QueuedLearningEvent {
  const now = new Date().toISOString();
  return {
    eventId: event.eventId,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    nextAttemptAt: now,
    event,
  };
}

function sortByCreatedAt(records: QueuedLearningEvent[]): QueuedLearningEvent[] {
  return [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Shared record-selection logic for both backends: an event is ready to
 * (re)send once its backoff window has elapsed.
 */
function selectDue(records: QueuedLearningEvent[], limit: number): LearningEvent[] {
  return sortByCreatedAt(records.filter((r) => isDue(r.nextAttemptAt)))
    .slice(0, limit)
    .map((r) => r.event);
}

class InMemoryEventStore implements LearningEventStore {
  private records = new Map<string, QueuedLearningEvent>();

  async enqueue(event: LearningEvent): Promise<void> {
    this.records.set(event.eventId, newQueuedEvent(event));
  }

  async getPending(limit = 50): Promise<LearningEvent[]> {
    return selectDue([...this.records.values()], limit);
  }

  async markSent(eventId: string): Promise<void> {
    this.records.delete(eventId);
  }

  async markFailed(eventId: string, error?: string): Promise<void> {
    const record = this.records.get(eventId);
    if (!record) return;
    const retryCount = record.retryCount + 1;
    this.records.set(eventId, {
      ...record,
      status: 'failed' as EventSyncStatus,
      retryCount,
      nextAttemptAt: computeNextAttemptAt(retryCount),
      lastError: error,
    });
  }

  async getPendingCount(): Promise<number> {
    return this.records.size;
  }
}

/**
 * IndexedDB-backed store. Every operation is guarded individually — a
 * failure here (quota, a blocked upgrade, a closed connection) is logged and
 * swallowed rather than thrown, because learning telemetry must never
 * interrupt gameplay.
 */
class IndexedDbEventStore implements LearningEventStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb(this.dbName);
    return this.dbPromise;
  }

  private async withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    return requestToPromise(work(store));
  }

  async enqueue(event: LearningEvent): Promise<void> {
    try {
      await this.withStore('readwrite', (store) => store.put(newQueuedEvent(event)));
    } catch (err) {
      logLearning(`Failed to enqueue event: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async getPending(limit = 50): Promise<LearningEvent[]> {
    try {
      const all = await this.withStore('readonly', (store) => store.getAll());
      return selectDue(all as QueuedLearningEvent[], limit);
    } catch (err) {
      logLearning(`Failed to read pending events: ${err instanceof Error ? err.message : 'unknown error'}`);
      return [];
    }
  }

  async markSent(eventId: string): Promise<void> {
    try {
      await this.withStore('readwrite', (store) => store.delete(eventId));
    } catch (err) {
      logLearning(`Failed to mark event sent: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async markFailed(eventId: string, error?: string): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = await requestToPromise(store.get(eventId) as IDBRequest<QueuedLearningEvent | undefined>);
      if (!record) return;
      const retryCount = record.retryCount + 1;
      await requestToPromise(
        store.put({
          ...record,
          status: 'failed' as EventSyncStatus,
          retryCount,
          nextAttemptAt: computeNextAttemptAt(retryCount),
          lastError: error,
        }),
      );
    } catch (err) {
      logLearning(`Failed to mark event failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      return await this.withStore('readonly', (store) => store.count());
    } catch (err) {
      logLearning(`Failed to count pending events: ${err instanceof Error ? err.message : 'unknown error'}`);
      return 0;
    }
  }
}

/**
 * `dbName` is overridable so tests can get a fully isolated store without
 * tearing down/recreating the shared production database between cases.
 */
export function createLearningEventStore(dbName: string = DB_NAME): LearningEventStore {
  if (isIndexedDbAvailable()) {
    return new IndexedDbEventStore(dbName);
  }
  return new InMemoryEventStore();
}

export const learningEventStore: LearningEventStore = createLearningEventStore();

export type { LearningEventStore } from './types';
