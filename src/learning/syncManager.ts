/**
 * Uploads queued learning events to the AI Learning Engine when a connection
 * is available. Entirely best-effort: any failure here is logged and
 * swallowed, never surfaced to gameplay.
 */
import type { LearningEventStore } from './types';
import type { LearningApiClient } from './apiClient';
import { learningEventStore } from './eventStore';
import { learningApiClient, isLearningSyncEnabled } from './apiClient';
import { logLearning } from './logger';

let syncInProgress = false;

export interface SyncManagerDeps {
  store?: LearningEventStore;
  apiClient?: LearningApiClient;
}

/**
 * Sends every currently-due pending event, one at a time. Safe to call as
 * often as you like — concurrent calls exit immediately via `syncInProgress`,
 * and each event only leaves the queue once the server has acknowledged it.
 */
export async function syncPendingEvents(deps: SyncManagerDeps = {}): Promise<void> {
  if (!isLearningSyncEnabled()) return;
  if (syncInProgress) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const store = deps.store ?? learningEventStore;
  const apiClient = deps.apiClient ?? learningApiClient;

  syncInProgress = true;
  try {
    const pending = await store.getPending();
    if (pending.length === 0) return;

    logLearning(`Sync started: ${pending.length} pending event(s)`);

    for (const event of pending) {
      try {
        const success = await apiClient.sendEvent(event);
        if (success) {
          await store.markSent(event.eventId);
          logLearning(`Event uploaded: ${event.eventId}`);
        } else {
          await store.markFailed(event.eventId, 'Upload failed');
          logLearning(`Sync failed for event: ${event.eventId}`);
        }
      } catch (err) {
        await store.markFailed(event.eventId, err instanceof Error ? err.message : 'Unknown error');
      }
    }
  } catch (err) {
    logLearning(`Sync failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  } finally {
    syncInProgress = false;
  }
}

const SYNC_INTERVAL_MS = 60_000;
let started = false;

/**
 * Wires up startup sync, connectivity-restored sync, and a gentle periodic
 * sync while the app is active. Safe to call multiple times — only the
 * first call attaches listeners.
 */
export function startLearningSync(): void {
  if (started) return;
  started = true;

  void syncPendingEvents();

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void syncPendingEvents());
    setInterval(() => void syncPendingEvents(), SYNC_INTERVAL_MS);
  }
}

/** Fire-and-forget sync trigger, e.g. after queuing a new event. */
export function triggerLearningSync(): void {
  void syncPendingEvents();
}
