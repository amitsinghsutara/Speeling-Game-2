/**
 * Orchestrates the "Child's Progress" screen's data: tries a live fetch,
 * falls back to the last cached summary when the engine can't be reached,
 * and tells the caller which of those happened so the UI can be honest
 * about whether what's shown is current or stale.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLearnerId } from '../learning';
import { progressApiClient } from './progressApiClient';
import { getCachedProgress, setCachedProgress, type CachedProgress } from './progressCache';
import type { ProgressResponse } from './types';

export type ChildProgressState =
  | { status: 'loading' }
  | { status: 'ready'; data: ProgressResponse }
  /** A live fetch succeeded but the learner doesn't have enough activity yet for any skill to report. */
  | { status: 'empty' }
  | { status: 'offline'; cached: CachedProgress | null }
  | { status: 'error'; cached: CachedProgress | null };

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useChildProgress() {
  const [state, setState] = useState<ChildProgressState>({ status: 'loading' });
  // Guards against a stale response clobbering a newer request's result if
  // the parent mashes "Refresh" before the first request has settled.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
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

  return { state, refresh: load };
}
