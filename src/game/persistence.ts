/**
 * Persists which levels the learner has completed so unlocked progress
 * survives a page reload. Falls back to an in-memory store if
 * localStorage is unavailable (private browsing, WebView restrictions).
 */
const STORAGE_KEY = 'spelling-game:completed-levels';

interface ProgressStore {
  getCompletedLevels(): number[];
  markLevelComplete(level: number): void;
}

function readLocalStorage(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return [];
  }
}

function writeLocalStorage(levels: number[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // Storage unavailable (e.g. private browsing quota) — progress simply
    // won't persist across reloads this session.
  }
}

function hasWorkingLocalStorage(): boolean {
  try {
    const testKey = `${STORAGE_KEY}:__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

class LocalStorageProgressStore implements ProgressStore {
  getCompletedLevels(): number[] {
    return readLocalStorage();
  }

  markLevelComplete(level: number): void {
    const current = new Set(readLocalStorage());
    current.add(level);
    writeLocalStorage([...current].sort((a, b) => a - b));
  }
}

class InMemoryProgressStore implements ProgressStore {
  private completed = new Set<number>();

  getCompletedLevels(): number[] {
    return [...this.completed].sort((a, b) => a - b);
  }

  markLevelComplete(level: number): void {
    this.completed.add(level);
  }
}

function createDefaultStore(): ProgressStore {
  if (typeof window !== 'undefined' && hasWorkingLocalStorage()) {
    return new LocalStorageProgressStore();
  }
  return new InMemoryProgressStore();
}

export const progressStore: ProgressStore = createDefaultStore();

/** A level is unlocked if it's Level 1, or the level before it is complete. */
export function isLevelUnlocked(level: number, completedLevels: number[]): boolean {
  if (level <= 1) return true;
  return completedLevels.includes(level - 1);
}
