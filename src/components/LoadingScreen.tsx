import { Mascot } from './Mascot';
import styles from './LoadingScreen.module.css';

/**
 * Covers the screen on first visit while the service worker finishes
 * precaching the game, so the learner never lands on a half-styled or
 * half-working page while assets are still arriving.
 */
export function LoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <Mascot mood="thinking" className={styles.mascot} />
      <p className={styles.message}>Getting the forest ready…</p>
      <div className={styles.barTrack} aria-hidden="true">
        <div className={styles.barFill} />
      </div>
    </div>
  );
}
