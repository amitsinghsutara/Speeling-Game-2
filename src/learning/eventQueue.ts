/**
 * Pure retry/backoff policy for the local event queue, kept separate from
 * storage I/O (`eventStore.ts`) so the schedule itself is simple to test.
 */

/** Exponential backoff schedule, capped at 5 minutes. Indexed by retry count. */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 300_000];

/**
 * Delay before the next attempt, given how many attempts have already
 * failed (1 = just failed for the first time). Per the spec's schedule, the
 * first failure waits 5s, the second 30s, the third 2m, and every one after
 * that caps at 5m.
 */
export function computeRetryDelayMs(retryCount: number): number {
  const index = Math.min(Math.max(retryCount - 1, 0), RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index];
}

/** ISO timestamp of the next allowed attempt after `retryCount` failures. */
export function computeNextAttemptAt(retryCount: number, now: number = Date.now()): string {
  return new Date(now + computeRetryDelayMs(retryCount)).toISOString();
}

/** Whether a scheduled retry time has arrived. */
export function isDue(nextAttemptAt: string, now: number = Date.now()): boolean {
  return new Date(nextAttemptAt).getTime() <= now;
}
