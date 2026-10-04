import { beforeEach, describe, expect, it } from 'vitest';
import { getCachedProgress, setCachedProgress } from './progressCache';
import type { ProgressResponse } from './types';

function sampleData(): ProgressResponse {
  return {
    learnerId: 'abc123',
    generatedAt: '2026-10-04T16:30:00Z',
    overall: { mastery: 0.78, trend: 'improving', summary: 'Great progress!' },
    skills: [{ id: 'short-vowels', name: 'Short Vowels', mastery: 0.67, trend: 'improving' }],
    strengths: ['Initial sounds'],
    practiceAreas: [],
    encouragement: 'Keep it up.',
  };
}

describe('progress cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been cached', () => {
    expect(getCachedProgress()).toBeNull();
  });

  it('round-trips a cached summary', () => {
    setCachedProgress(sampleData(), '2026-10-04T16:30:00.000Z');

    const cached = getCachedProgress();
    expect(cached).toEqual({ data: sampleData(), retrievedAt: '2026-10-04T16:30:00.000Z' });
  });

  it('rejects cached data that no longer matches the schema', () => {
    window.localStorage.setItem(
      'forestSpellingParentProgress',
      JSON.stringify({ data: { nonsense: true }, retrievedAt: '2026-10-04T16:30:00.000Z' }),
    );

    expect(getCachedProgress()).toBeNull();
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    window.localStorage.setItem('forestSpellingParentProgress', '{not json');
    expect(() => getCachedProgress()).not.toThrow();
    expect(getCachedProgress()).toBeNull();
  });

  it('does not throw when storage is unavailable', () => {
    const original = window.localStorage;
    const broken = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => {
        throw new Error('unavailable');
      },
      removeItem: () => {
        throw new Error('unavailable');
      },
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage;
    Object.defineProperty(window, 'localStorage', { value: broken, configurable: true });

    try {
      expect(() => setCachedProgress(sampleData(), '2026-10-04T16:30:00.000Z')).not.toThrow();
      expect(getCachedProgress()).toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
    }
  });
});
