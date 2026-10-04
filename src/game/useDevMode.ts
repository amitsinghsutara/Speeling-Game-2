import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'spelling-game:dev-mode';

/** Taps required at the trigger point, within the rolling window, to flip dev mode. */
const TAP_THRESHOLD = 7;
const TAP_WINDOW_MS = 2500;

function readStoredDevMode(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredDevMode(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — dev mode simply won't persist across reloads.
  }
}

/**
 * Hidden testing aid for QA: tapping a trigger point `TAP_THRESHOLD` times
 * within `TAP_WINDOW_MS` toggles dev mode, which unlocks every level and
 * puzzle so a tester can jump straight to any content without replaying
 * everything before it. Not discoverable from the UI by design.
 */
export function useDevMode() {
  const [enabled, setEnabled] = useState(readStoredDevMode);
  const tapTimestamps = useRef<number[]>([]);

  useEffect(() => {
    writeStoredDevMode(enabled);
  }, [enabled]);

  const registerTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current = [...tapTimestamps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (tapTimestamps.current.length >= TAP_THRESHOLD) {
      tapTimestamps.current = [];
      setEnabled((prev) => !prev);
    }
  }, []);

  return { enabled, registerTap };
}
