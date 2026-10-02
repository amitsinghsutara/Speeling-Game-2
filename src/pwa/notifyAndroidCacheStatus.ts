declare global {
  interface Window {
    /** JS bridge injected by the native Android app wrapper; absent in a regular browser. */
    Android?: {
      cachedStatus?: (isContentCached: boolean) => void;
    };
  }
}

/** Tells the native Android shell, if present, whether the game is fully cached for offline use. */
export function notifyAndroidCacheStatus(isContentCached: boolean): void {
  window.Android?.cachedStatus?.(isContentCached);
}
