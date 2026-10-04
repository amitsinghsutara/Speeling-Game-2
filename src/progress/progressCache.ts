/**
 * Caches the last successfully retrieved progress summary so a parent still
 * sees something useful if the AI Learning Engine is unreachable later.
 * Re-validated with the same Zod schema on read — a previous app version or
 * a corrupted value should never reach the UI unchecked.
 */
import { progressResponseSchema, type ProgressResponse } from './types';

const STORAGE_KEY = 'forestSpellingParentProgress';

export interface CachedProgress {
  data: ProgressResponse;
  retrievedAt: string;
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

export function getCachedProgress(): CachedProgress | null {
  if (typeof window === 'undefined' || !hasWorkingLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { data, retrievedAt } = parsed as { data?: unknown; retrievedAt?: unknown };
    if (typeof retrievedAt !== 'string') return null;

    const result = progressResponseSchema.safeParse(data);
    if (!result.success) return null;

    return { data: result.data, retrievedAt };
  } catch {
    return null;
  }
}

export function setCachedProgress(data: ProgressResponse, retrievedAt: string): void {
  if (typeof window === 'undefined' || !hasWorkingLocalStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, retrievedAt }));
  } catch {
    // Storage unavailable (e.g. private browsing quota) — caching simply
    // won't persist this session.
  }
}
