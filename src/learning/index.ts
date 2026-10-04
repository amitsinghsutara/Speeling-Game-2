/**
 * Public surface of the learning event layer. Game code should only ever
 * import from here, not from the individual modules.
 */
export type { LearningEvent } from './types';
export { getLearnerId } from './learnerId';
export { recordAnswerEvent, type RecordAnswerEventInput, slugifySkill } from './eventCollector';
export { startLearningSync, triggerLearningSync } from './syncManager';
export { learningEventStore } from './eventStore';
export { isLearningSyncEnabled } from './apiClient';
