/**
 * Stable, anonymous learner identifier. No name, email, or account is ever
 * collected — just a random UUID persisted locally so the same learner's
 * events can be grouped across sessions. Falls back to an in-memory id
 * (stable for the current session only) if local storage is unavailable,
 * matching the fallback strategy already used by `game/persistence.ts`.
 */
const STORAGE_KEY = 'forestSpellingLearnerId';

interface LearnerIdStore {
  getLearnerId(): string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (very old WebViews).
  return `learner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

class LocalStorageLearnerIdStore implements LearnerIdStore {
  getLearnerId(): string {
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;

      const id = generateId();
      window.localStorage.setItem(STORAGE_KEY, id);
      return id;
    } catch {
      // Storage became unavailable after the initial check (e.g. quota) —
      // fall back to a fresh id for this call rather than failing.
      return generateId();
    }
  }
}

class InMemoryLearnerIdStore implements LearnerIdStore {
  private id: string | null = null;

  getLearnerId(): string {
    if (!this.id) this.id = generateId();
    return this.id;
  }
}

function createDefaultStore(): LearnerIdStore {
  if (typeof window !== 'undefined' && hasWorkingLocalStorage()) {
    return new LocalStorageLearnerIdStore();
  }
  return new InMemoryLearnerIdStore();
}

const learnerIdStore: LearnerIdStore = createDefaultStore();

/** Returns the stable anonymous id for this learner, creating one on first call. */
export function getLearnerId(): string {
  return learnerIdStore.getLearnerId();
}
