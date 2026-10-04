/**
 * Gameplay-facing entry point for learning telemetry. The game only ever
 * calls `recordAnswerEvent` — it never touches IndexedDB, the API client, or
 * sync scheduling directly.
 */
import type { LearningEvent } from './types';
import { getLearnerId } from './learnerId';
import { learningEventStore } from './eventStore';
import { triggerLearningSync } from './syncManager';
import { logLearning } from './logger';

export interface RecordAnswerEventInput {
  levelId: string;
  puzzleId: string;
  skillId: string;
  targetWord: string;
  selectedAnswer?: string;
  correct: boolean;
  /** Foil-type code for the selected wrong answer; omit for a correct answer. */
  foilType?: string;
  difficulty?: string;
  responseTimeMs?: number;
  attemptNumber: number;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Converts a free-text curriculum skill label (e.g. "CVC, short vowels")
 * into a stable identifier (e.g. "cvc-short-vowels") so the Learning Engine
 * never has to infer or re-derive the skill from the word itself.
 */
export function slugifySkill(skill: string): string {
  const slug = skill
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown-skill';
}

export function buildAnswerEvent(input: RecordAnswerEventInput): LearningEvent {
  return {
    eventId: generateEventId(),
    learnerId: getLearnerId(),
    applicationId: 'forest-spelling-adventure',
    eventType: 'answer_submitted',
    activity: {
      levelId: input.levelId,
      puzzleId: input.puzzleId,
      skillId: input.skillId,
      targetWord: input.targetWord,
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    },
    interaction: {
      ...(input.selectedAnswer !== undefined ? { selectedAnswer: input.selectedAnswer } : {}),
      correct: input.correct,
      ...(input.responseTimeMs !== undefined ? { responseTimeMs: input.responseTimeMs } : {}),
      attemptNumber: input.attemptNumber,
    },
    ...(!input.correct && input.foilType !== undefined ? { metadata: { foilType: input.foilType } } : {}),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Records a learner's answer as a queued learning event and nudges a
 * background sync. Never throws and never awaited by callers — gameplay
 * must proceed identically whether this succeeds, fails, or is slow.
 */
export function recordAnswerEvent(input: RecordAnswerEventInput): void {
  try {
    const event = buildAnswerEvent(input);
    void learningEventStore
      .enqueue(event)
      .then(() => {
        logLearning(`Event queued: ${event.eventId}`);
        triggerLearningSync();
      })
      .catch((err: unknown) => {
        logLearning(`Failed to queue event: ${err instanceof Error ? err.message : 'unknown error'}`);
      });
  } catch (err) {
    logLearning(`Failed to record event: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}
