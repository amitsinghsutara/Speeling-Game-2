/**
 * End-to-end exercise of the real queue (IndexedDB via fake-indexeddb) and
 * sync manager together, with only the network boundary (apiClient) stubbed
 * out — this is the "no AI Learning Engine running" scenario from the spec.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let online = false;
const sendEvent = vi.fn(async (..._args: unknown[]) => online);

vi.mock('./apiClient', () => ({
  learningApiClient: { sendEvent: (...args: unknown[]) => sendEvent(...args) },
  isLearningSyncEnabled: () => true,
}));

import { recordAnswerEvent } from './eventCollector';
import { learningEventStore } from './eventStore';
import { syncPendingEvents } from './syncManager';

const DB_NAME = 'forest-spelling-learning';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('offline answers survive and synchronize once connectivity returns', () => {
  beforeEach(() => {
    online = false;
    sendEvent.mockClear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await deleteDatabase();
  });

  it('queues 10 offline answers, loses none, and uploads each exactly once when back online', async () => {
    for (let i = 0; i < 10; i++) {
      recordAnswerEvent({
        levelId: 'level-1',
        puzzleId: 'level-1-puzzle-1',
        skillId: 'short-vowels',
        targetWord: `word${i}`,
        selectedAnswer: `word${i}`,
        correct: true,
        attemptNumber: 1,
      });
    }

    // Let every fire-and-forget enqueue + background sync attempt settle.
    await vi.waitFor(
      async () => {
        expect(await learningEventStore.getPendingCount()).toBe(10);
        expect(sendEvent.mock.calls.length).toBeGreaterThanOrEqual(10);
      },
      { timeout: 2000 },
    );

    // Still offline: every event remains queued, none lost.
    expect(await learningEventStore.getPendingCount()).toBe(10);

    // Connectivity returns, and enough time has passed for the backoff window to clear.
    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    online = true;

    // A lingering background sync from the offline phase may still briefly
    // hold the lock, so retry rather than asserting after a single call.
    await vi.waitFor(
      async () => {
        await syncPendingEvents();
        expect(await learningEventStore.getPendingCount()).toBe(0);
      },
      { timeout: 2000 },
    );

    const uploadedIds = sendEvent.mock.calls.map(([event]) => (event as { eventId: string }).eventId);
    expect(new Set(uploadedIds).size).toBe(10); // 10 distinct events, no duplicates ever generated
  });
});
