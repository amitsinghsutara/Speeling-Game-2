/**
 * Structured learner-interaction events produced by the game and delivered
 * to the separate AI Learning Engine project. This module must stay free of
 * any AI/analysis logic — the game only describes what happened; it never
 * interprets it.
 */

export type ApplicationId = 'forest-spelling-adventure';

/** Event types the game can emit. Only `answer_submitted` is implemented today. */
export type LearningEventType = 'answer_submitted';

export interface LearningEventActivity {
  levelId: string;
  puzzleId: string;
  skillId: string;
  targetWord: string;
  difficulty?: string;
}

export interface LearningEventInteraction {
  selectedAnswer?: string;
  correct: boolean;
  /** Measured with performance.now(); omitted if timing was unavailable. */
  responseTimeMs?: number;
  attemptNumber: number;
}

export interface LearningEventMetadata {
  /** Raw foil-type code (e.g. "V", "FC"), present only for incorrect answers. */
  foilType?: string;
}

export interface LearningEvent {
  /** Client-generated idempotency key. Never regenerated when retrying an upload. */
  eventId: string;
  learnerId: string;
  applicationId: ApplicationId;
  eventType: LearningEventType;
  activity: LearningEventActivity;
  interaction: LearningEventInteraction;
  metadata?: LearningEventMetadata;
  /** ISO-8601 timestamp of when the event occurred. */
  timestamp: string;
}

/** Internal sync bookkeeping for a queued event. Never sent to the server. */
export type EventSyncStatus = 'pending' | 'failed';

export interface QueuedLearningEvent {
  eventId: string;
  status: EventSyncStatus;
  retryCount: number;
  createdAt: string;
  /** Earliest time this event should be attempted again. */
  nextAttemptAt: string;
  lastError?: string;
  event: LearningEvent;
}

export interface LearningEventStore {
  enqueue(event: LearningEvent): Promise<void>;
  getPending(limit?: number): Promise<LearningEvent[]>;
  markSent(eventId: string): Promise<void>;
  markFailed(eventId: string, error?: string): Promise<void>;
  getPendingCount(): Promise<number>;
}
