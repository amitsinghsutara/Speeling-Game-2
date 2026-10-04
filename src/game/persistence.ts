/**
 * Persists which puzzles the learner has completed in each level, so
 * unlocked progress survives a page reload. Falls back to an in-memory
 * store if localStorage is unavailable (private browsing, WebView
 * restrictions). Purely storage I/O — lock/unlock/complete rules live in
 * `game/engine.ts` as pure, testable functions over this data.
 */
const STORAGE_KEY = 'spelling-game:puzzle-progress';
const STARS_KEY = 'spelling-game:puzzle-stars';

/** Maps a level number to the list of completed puzzle numbers (1-indexed) within it. */
export type PuzzleProgress = Record<number, number[]>;

/** Maps a level number to a map of puzzle number -> best star rating (1-3) earned for it. */
export type PuzzleStars = Record<number, Record<number, number>>;

interface ProgressStore {
  getProgress(): PuzzleProgress;
  markPuzzleComplete(level: number, puzzleNumber: number): void;
  getStars(): PuzzleStars;
  markPuzzleStars(level: number, puzzleNumber: number, stars: number): void;
}

function isValidProgress(value: unknown): value is PuzzleProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((v) => Array.isArray(v) && v.every((n) => typeof n === 'number'));
}

function isValidStars(value: unknown): value is PuzzleStars {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (v) =>
      !!v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.values(v).every((n) => typeof n === 'number'),
  );
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

function readStarsFromLocalStorage(): PuzzleStars {
  try {
    const raw = window.localStorage.getItem(STARS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isValidStars(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStarsToLocalStorage(stars: PuzzleStars): void {
  try {
    window.localStorage.setItem(STARS_KEY, JSON.stringify(stars));
  } catch {
    // Storage unavailable — stars simply won't persist across reloads this session.
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

/** Records a puzzle's star rating, keeping the best of any prior attempt. */
function recordPuzzleStars(stars: PuzzleStars, level: number, puzzleNumber: number, newStars: number): PuzzleStars {
  const starsForLevel = stars[level] ?? {};
  const best = Math.max(starsForLevel[puzzleNumber] ?? 0, newStars);
  return { ...stars, [level]: { ...starsForLevel, [puzzleNumber]: best } };
}

class LocalStorageProgressStore implements ProgressStore {
  getProgress(): PuzzleProgress {
    return readLocalStorage();
  }

  markPuzzleComplete(level: number, puzzleNumber: number): void {
    writeLocalStorage(addCompletedPuzzle(readLocalStorage(), level, puzzleNumber));
  }

  getStars(): PuzzleStars {
    return readStarsFromLocalStorage();
  }

  markPuzzleStars(level: number, puzzleNumber: number, stars: number): void {
    writeStarsToLocalStorage(recordPuzzleStars(readStarsFromLocalStorage(), level, puzzleNumber, stars));
  }
}

class InMemoryProgressStore implements ProgressStore {
  private progress: PuzzleProgress = {};
  private stars: PuzzleStars = {};

  getProgress(): PuzzleProgress {
    return this.progress;
  }

  markPuzzleComplete(level: number, puzzleNumber: number): void {
    this.progress = addCompletedPuzzle(this.progress, level, puzzleNumber);
  }

  getStars(): PuzzleStars {
    return this.stars;
  }

  markPuzzleStars(level: number, puzzleNumber: number, stars: number): void {
    this.stars = recordPuzzleStars(this.stars, level, puzzleNumber, stars);
  }
}

function createDefaultStore(): ProgressStore {
  if (typeof window !== 'undefined' && hasWorkingLocalStorage()) {
    return new LocalStorageProgressStore();
  }
  return new InMemoryProgressStore();
}

export const progressStore: ProgressStore = createDefaultStore();
