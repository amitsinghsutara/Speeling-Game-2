/**
 * Persists which puzzles the learner has completed in each level, so
 * unlocked progress survives a page reload. Falls back to an in-memory
 * store if localStorage is unavailable (private browsing, WebView
 * restrictions). Purely storage I/O — lock/unlock/complete rules live in
 * `game/engine.ts` as pure, testable functions over this data.
 */
const STORAGE_KEY = 'spelling-game:puzzle-progress';

/** Maps a level number to the list of completed puzzle numbers (1-indexed) within it. */
export type PuzzleProgress = Record<number, number[]>;

interface ProgressStore {
  getProgress(): PuzzleProgress;
  markPuzzleComplete(level: number, puzzleNumber: number): void;
}

function isValidProgress(value: unknown): value is PuzzleProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((v) => Array.isArray(v) && v.every((n) => typeof n === 'number'));
}

function readLocalStorage(): PuzzleProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isValidProgress(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStorage(progress: PuzzleProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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

function addCompletedPuzzle(progress: PuzzleProgress, level: number, puzzleNumber: number): PuzzleProgress {
  const completedForLevel = new Set(progress[level] ?? []);
  completedForLevel.add(puzzleNumber);
  return { ...progress, [level]: [...completedForLevel].sort((a, b) => a - b) };
}

class LocalStorageProgressStore implements ProgressStore {
  getProgress(): PuzzleProgress {
    return readLocalStorage();
  }

  markPuzzleComplete(level: number, puzzleNumber: number): void {
    writeLocalStorage(addCompletedPuzzle(readLocalStorage(), level, puzzleNumber));
  }
}

class InMemoryProgressStore implements ProgressStore {
  private progress: PuzzleProgress = {};

  getProgress(): PuzzleProgress {
    return this.progress;
  }

  markPuzzleComplete(level: number, puzzleNumber: number): void {
    this.progress = addCompletedPuzzle(this.progress, level, puzzleNumber);
  }
}

function createDefaultStore(): ProgressStore {
  if (typeof window !== 'undefined' && hasWorkingLocalStorage()) {
    return new LocalStorageProgressStore();
  }
  return new InMemoryProgressStore();
}

export const progressStore: ProgressStore = createDefaultStore();
