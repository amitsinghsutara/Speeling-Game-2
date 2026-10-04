/**
 * Development-only logging for the learning event pipeline. Never logs full
 * event payloads (which could include learner interaction detail) — just
 * short status lines, and only in dev builds.
 */
export function logLearning(message: string): void {
  if (import.meta.env.DEV) {
    console.log(`[Learning] ${message}`);
  }
}
