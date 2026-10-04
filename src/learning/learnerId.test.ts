import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'forestSpellingLearnerId';

describe('getLearnerId', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('creates an id when none exists yet and persists it', async () => {
    const { getLearnerId } = await import('./learnerId');
    const id = getLearnerId();

    expect(id).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(id);
  });

  it('reuses the existing id across calls, simulating a later launch', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'existing-learner-id');
    const { getLearnerId } = await import('./learnerId');

    expect(getLearnerId()).toBe('existing-learner-id');
    expect(getLearnerId()).toBe('existing-learner-id');
  });

  it('falls back to a stable in-memory id when persistence is unavailable', async () => {
    const original = window.localStorage;
    const broken = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
      removeItem: () => {
        throw new Error('storage unavailable');
      },
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage;
    Object.defineProperty(window, 'localStorage', { value: broken, configurable: true });

    try {
      const { getLearnerId } = await import('./learnerId');
      const first = getLearnerId();
      const second = getLearnerId();
      expect(first).toBeTruthy();
      expect(first).toBe(second);
    } finally {
      Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
    }
  });
});
