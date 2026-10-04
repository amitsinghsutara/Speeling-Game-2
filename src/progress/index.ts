/**
 * Public surface of the "Child's Progress" feature. Components should only
 * ever import from here.
 */
export type { ProgressResponse, ProgressFetchResult, ProgressApiClient } from './types';
export { progressResponseSchema } from './types';
export { progressApiClient } from './progressApiClient';
export { getCachedProgress, setCachedProgress, type CachedProgress } from './progressCache';
export { useChildProgress, type ChildProgressState } from './useChildProgress';
