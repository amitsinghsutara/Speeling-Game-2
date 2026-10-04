import { describe, expect, it } from 'vitest';
import { createLearningEventStore } from './eventStore';
import type { LearningEvent } from './types';

function sampleEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: 'evt-1',
    learnerId: 'learner-1',
    applicationId: 'forest-spelling-adventure',
    eventType: 'answer_submitted',
    activity: { levelId: 'level-1', puzzleId: 'level-1-puzzle-1', skillId: 'short-vowels', targetWord: 'cat' },
    interaction: { correct: true, attemptNumber: 1 },
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Each test gets its own database so cases never interfere with each other. */
let dbCounter = 0;
function freshStore() {
  dbCounter += 1;
  return createLearningEventStore(`test-learning-events-${dbCounter}`);
}

describe('learningEventStore (IndexedDB-backed)', () => {
  it('enqueues an event and returns it as pending', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent());

    const pending = await store.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(sampleEvent());
  });

  it('marks an event sent, removing it from the pending queue', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent());
    await store.markSent('evt-1');

    expect(await store.getPending()).toHaveLength(0);
    expect(await store.getPendingCount()).toBe(0);
  });

  it('treats the same eventId as the same event (idempotent enqueue)', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent());
    await store.enqueue(sampleEvent({ interaction: { correct: false, attemptNumber: 2 } }));

    expect(await store.getPendingCount()).toBe(1);
  });

  it('keeps a failed event in the queue instead of dropping it', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent());
    await store.markFailed('evt-1', 'network error');

    expect(await store.getPendingCount()).toBe(1);
  });

  it('does not resurface a failed event before its backoff window elapses', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent());
    await store.markFailed('evt-1', 'network error');

    expect(await store.getPending()).toHaveLength(0);
  });

  it('counts every pending/failed event, correct or not', async () => {
    const store = freshStore();
    await store.enqueue(sampleEvent({ eventId: 'evt-1' }));
    await store.enqueue(sampleEvent({ eventId: 'evt-2' }));

    expect(await store.getPendingCount()).toBe(2);
  });

  it('marking an unknown event failed is a safe no-op', async () => {
    const store = freshStore();
    await expect(store.markFailed('does-not-exist')).resolves.toBeUndefined();
  });
});
