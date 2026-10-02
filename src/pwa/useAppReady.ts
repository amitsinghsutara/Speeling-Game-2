import { useEffect, useState } from 'react';
import { notifyAndroidCacheStatus } from './notifyAndroidCacheStatus';

/**
 * Upper bound on how long the loading screen will wait for `offlineReady`.
 * Covers browsers without service worker support, a registration that
 * fails outright, or a dev-mode worker that never really precaches (see
 * the devOptions comment in vite.config.ts) — none of those ever fire
 * `offlineReady`, so without this the learner would be stuck forever.
 */
const READY_FALLBACK_TIMEOUT_MS = 6000;

/**
 * True once it's safe to show the game: either a service worker from an
 * earlier visit already controls this page (already cached), the current
 * service worker just finished precaching everything needed to play
 * offline, or the fallback timeout above has elapsed.
 */
export function useAppReady(offlineReady: boolean): boolean {
  const [ready, setReady] = useState(
    () => typeof navigator === 'undefined' || !navigator.serviceWorker || !!navigator.serviceWorker.controller,
  );

  useEffect(() => {
    if (navigator.serviceWorker?.controller) {
      notifyAndroidCacheStatus(true);
    }
  }, []);

  useEffect(() => {
    if (offlineReady) {
      notifyAndroidCacheStatus(true);
      setReady(true);
    }
  }, [offlineReady]);

  useEffect(() => {
    if (ready) return;
    const timeoutId = window.setTimeout(() => setReady(true), READY_FALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [ready]);

  return ready;
}
