/**
 * Orchestrates the "Child's Progress" screen's data: serves a recent cached
 * summary immediately when one exists so opening the screen doesn't re-run
 * the engine's (slow, LLM-backed) analysis every time, otherwise tries a
 * live fetch and falls back to the last cached summary when the engine
 * can't be reached — telling the caller which of those happened so the UI
 * can be honest about whether what's shown is current or stale.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLearnerId } from '../learning';
import { progressApiClient } from './progressApiClient';
import { getCachedProgress, isCacheFresh, setCachedProgress, type CachedProgress } from './progressCache';
import type { ProgressResponse } from './types';

export type ChildProgressState =
  | { status: 'loading' }
  | { status: 'ready'; data: ProgressResponse }
  /** A live fetch succeeded but the learner doesn't have enough activity yet for any skill to report. */
  | { status: 'empty' }
  | { status: 'offline'; cached: CachedProgress | null }
  | { status: 'error'; cached: CachedProgress | null };

// How long a cached summary is treated as current enough to skip a live
// re-analysis when the screen is reopened. The parent's explicit "Refresh"
// button always bypasses this and forces a fresh fetch.
const CACHE_FRESH_MS = 10 * 60 * 1000;

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useChildProgress() {
  const [state, setState] = useState<ChildProgressState>({ status: 'loading' });
  // Guards against a stale response clobbering a newer request's result if
  // the parent mashes "Refresh" before the first request has settled.
  const requestIdRef = useRef(0);

  const load = useCallback(async (options?: { force?: boolean }) => {
    const requestId = ++requestIdRef.current;
    const force = options?.force ?? false;

    if (!force) {
      const cached = getCachedProgress();
      if (cached && isCacheFresh(cached, CACHE_FRESH_MS)) {
        setState(cached.data.skills.length === 0 ? { status: 'empty' } : { status: 'ready', data: cached.data });
        return;
      }
    }

    setState({ status: 'loading' });

    if (isOffline()) {
      if (requestId === requestIdRef.current) {
        setState({ status: 'offline', cached: getCachedProgress() });
      }
      return;
    }

    const result = await progressApiClient.getLearnerProgress(getLearnerId());
    if (requestId !== requestIdRef.current) return;

    if (result.status === 'success') {
      setCachedProgress(result.data, new Date().toISOString());
      setState(result.data.skills.length === 0 ? { status: 'empty' } : { status: 'ready', data: result.data });
      return;
    }

    setState({ status: 'error', cached: getCachedProgress() });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load({ force: true }), [load]);

  return { state, refresh };
}
