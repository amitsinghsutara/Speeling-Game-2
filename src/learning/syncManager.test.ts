import { describe, expect, it, vi } from 'vitest';
import type { LearningApiClient } from './apiClient';
import { syncPendingEvents } from './syncManager';
import type { LearningEvent, LearningEventStore } from './types';

function sampleEvent(eventId: string): LearningEvent {
  return {
    eventId,
    learnerId: 'learner-1',
    applicationId: 'forest-spelling-adventure',
    eventType: 'answer_submitted',
    activity: { levelId: 'level-1', puzzleId: 'level-1-puzzle-1', skillId: 'short-vowels', targetWord: 'cat' },
    interaction: { correct: true, attemptNumber: 1 },
    timestamp: '2026-01-01T00:00:00.000Z',
  };
}

function makeStore(events: LearningEvent[]) {
  const sent: string[] = [];
  const failed: string[] = [];
  let getPendingCalls = 0;

  const store: LearningEventStore = {
    async enqueue() {},
    async getPending() {
      getPendingCalls++;
      return events;
    },
    async markSent(eventId: string) {
      sent.push(eventId);
    },
    async markFailed(eventId: string) {
      failed.push(eventId);
    },
    async getPendingCount() {
      return events.length;
    },
  };

  return { store, sent, failed, getPendingCalls: () => getPendingCalls };
}

describe('syncPendingEvents', () => {
  it('sends every pending event and marks each sent on success', async () => {
    const { store, sent, failed } = makeStore([sampleEvent('a'), sampleEvent('b')]);
    const apiClient: LearningApiClient = { sendEvent: vi.fn().mockResolvedValue(true) };

    await syncPendingEvents({ store, apiClient });

    expect(apiClient.sendEvent).toHaveBeenCalledTimes(2);
    expect(sent).toEqual(['a', 'b']);
    expect(failed).toEqual([]);
  });

  it('keeps an event queued when the upload fails', async () => {
    const { store, sent, failed } = makeStore([sampleEvent('a')]);
    const apiClient: LearningApiClient = { sendEvent: vi.fn().mockResolvedValue(false) };

    await syncPendingEvents({ store, apiClient });

    expect(sent).toEqual([]);
    expect(failed).toEqual(['a']);
  });

  it('marks an event failed if the client throws unexpectedly, without crashing the sync', async () => {
    const { store, failed } = makeStore([sampleEvent('a'), sampleEvent('b')]);
    const apiClient: LearningApiClient = {
      sendEvent: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true),
    };

    await expect(syncPendingEvents({ store, apiClient })).resolves.toBeUndefined();
    expect(failed).toEqual(['a']);
  });

  it('does nothing when there are no pending events', async () => {
    const { store } = makeStore([]);
    const apiClient: LearningApiClient = { sendEvent: vi.fn() };

    await syncPendingEvents({ store, apiClient });

    expect(apiClient.sendEvent).not.toHaveBeenCalled();
  });

  it('prevents concurrent synchronization passes', async () => {
    const { store, getPendingCalls } = makeStore([sampleEvent('a')]);
    let resolveSend: (value: boolean) => void = () => {};
    const pendingSend = new Promise<boolean>((resolve) => {
      resolveSend = resolve;
    });
    const apiClient: LearningApiClient = { sendEvent: vi.fn().mockReturnValue(pendingSend) };

    const first = syncPendingEvents({ store, apiClient });
    const second = syncPendingEvents({ store, apiClient }); // should bail out immediately — a sync is in flight

    resolveSend(true);
    await Promise.all([first, second]);

    expect(getPendingCalls()).toBe(1);
    expect(apiClient.sendEvent).toHaveBeenCalledTimes(1);
  });

  it('allows a later sync once the previous one has finished', async () => {
    const { store, sent } = makeStore([sampleEvent('a')]);
    const apiClient: LearningApiClient = { sendEvent: vi.fn().mockResolvedValue(true) };

    await syncPendingEvents({ store, apiClient });
    await syncPendingEvents({ store, apiClient });

    expect(sent).toEqual(['a', 'a']); // called twice, lock released between runs
  });
});
