import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, triggerSyncMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  triggerSyncMock: vi.fn(),
}));
vi.mock('./eventStore', () => ({
  learningEventStore: { enqueue: sendMock },
}));
vi.mock('./syncManager', () => ({
  triggerLearningSync: triggerSyncMock,
}));

import { buildAnswerEvent, recordAnswerEvent, slugifySkill } from './eventCollector';

describe('slugifySkill', () => {
  it('converts a display label into a stable kebab-case slug', () => {
    expect(slugifySkill('CVC, short vowels')).toBe('cvc-short-vowels');
    expect(slugifySkill('Consonant blends (CCVC, CVCC)')).toBe('consonant-blends-ccvc-cvcc');
  });

  it('falls back to a default for an empty or unusable label', () => {
    expect(slugifySkill('   ')).toBe('unknown-skill');
    expect(slugifySkill('')).toBe('unknown-skill');
  });
});

describe('buildAnswerEvent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function baseInput() {
    return {
      levelId: 'level-1',
      puzzleId: 'level-1-puzzle-1',
      skillId: 'short-vowels',
      targetWord: 'cat',
      correct: true,
      attemptNumber: 1,
    };
  }

  it('stamps learnerId, applicationId, eventType and a parseable timestamp', () => {
    const event = buildAnswerEvent(baseInput());

    expect(event.applicationId).toBe('forest-spelling-adventure');
    expect(event.eventType).toBe('answer_submitted');
    expect(event.learnerId).toBeTruthy();
    expect(() => new Date(event.timestamp).toISOString()).not.toThrow();
  });

  it('generates a unique eventId per call', () => {
    const a = buildAnswerEvent(baseInput());
    const b = buildAnswerEvent(baseInput());
    expect(a.eventId).toBeTruthy();
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('records a correct answer without a foil type', () => {
    const event = buildAnswerEvent({ ...baseInput(), selectedAnswer: 'cat', correct: true });
    expect(event.interaction.correct).toBe(true);
    expect(event.interaction.selectedAnswer).toBe('cat');
    expect(event.metadata).toBeUndefined();
  });

  it('records an incorrect answer together with its foil type', () => {
    const event = buildAnswerEvent({
      ...baseInput(),
      selectedAnswer: 'cit',
      correct: false,
      foilType: 'V',
    });
    expect(event.interaction.correct).toBe(false);
    expect(event.interaction.selectedAnswer).toBe('cit');
    expect(event.metadata).toEqual({ foilType: 'V' });
  });

  it('records the given attempt number', () => {
    const event = buildAnswerEvent({ ...baseInput(), correct: false, attemptNumber: 3 });
    expect(event.interaction.attemptNumber).toBe(3);
  });

  it('omits responseTimeMs when it was not provided', () => {
    const event = buildAnswerEvent(baseInput());
    expect(event.interaction.responseTimeMs).toBeUndefined();
  });

  it('includes responseTimeMs when provided', () => {
    const event = buildAnswerEvent({ ...baseInput(), responseTimeMs: 4210 });
    expect(event.interaction.responseTimeMs).toBe(4210);
  });
});

describe('recordAnswerEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues the event and triggers a background sync', async () => {
    sendMock.mockResolvedValue(undefined);

    recordAnswerEvent({
      levelId: 'level-1',
      puzzleId: 'level-1-puzzle-1',
      skillId: 'short-vowels',
      targetWord: 'cat',
      correct: true,
      attemptNumber: 1,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(triggerSyncMock).toHaveBeenCalledTimes(1);
  });

  it('never throws even if the store rejects', () => {
    sendMock.mockRejectedValue(new Error('indexeddb unavailable'));

    expect(() =>
      recordAnswerEvent({
        levelId: 'level-1',
        puzzleId: 'level-1-puzzle-1',
        skillId: 'short-vowels',
        targetWord: 'cat',
        correct: true,
        attemptNumber: 1,
      }),
    ).not.toThrow();
  });
});
