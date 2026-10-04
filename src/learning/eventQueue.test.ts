import { describe, expect, it } from 'vitest';
import { computeNextAttemptAt, computeRetryDelayMs, isDue } from './eventQueue';

describe('computeRetryDelayMs', () => {
  it('follows the spec schedule: 5s, 30s, 2m, then capped at 5m', () => {
    expect(computeRetryDelayMs(1)).toBe(5_000);
    expect(computeRetryDelayMs(2)).toBe(30_000);
    expect(computeRetryDelayMs(3)).toBe(120_000);
    expect(computeRetryDelayMs(4)).toBe(300_000);
  });

  it('caps at the maximum delay instead of growing unbounded', () => {
    expect(computeRetryDelayMs(10)).toBe(300_000);
    expect(computeRetryDelayMs(1000)).toBe(300_000);
  });
});

describe('computeNextAttemptAt / isDue', () => {
  it('schedules a retry that is not due immediately', () => {
    const now = 1_000_000;
    const next = computeNextAttemptAt(0, now);
    expect(isDue(next, now)).toBe(false);
  });

  it('becomes due once the delay has elapsed', () => {
    const now = 1_000_000;
    const next = computeNextAttemptAt(0, now);
    expect(isDue(next, now + 5_000)).toBe(true);
  });

  it('is not due partway through the window', () => {
    const now = 1_000_000;
    const next = computeNextAttemptAt(2, now); // second failure -> 30s delay
    expect(isDue(next, now + 10_000)).toBe(false);
  });
});
