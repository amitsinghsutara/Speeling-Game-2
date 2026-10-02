import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameButton } from './GameButton';
import styles from './UpdatePrompt.module.css';

/**
 * Small banner that appears once a new version of the game has finished
 * downloading in the background. Nothing updates silently — the learner
 * (or the adult with them) chooses when to refresh, so an update never
 * interrupts an answer mid-question.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [updating, setUpdating] = useState(false);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    setUpdating(true);

    // Reload the instant the new worker actually takes control — this is
    // the one event the spec guarantees, so we don't depend on any
    // library-specific "is this an update" inference to fire a reload.
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    // Safety net: if controllerchange never fires for some reason, reload
    // anyway after a moment rather than leaving the learner stuck.
    setTimeout(() => window.location.reload(), 3000);

    updateServiceWorker(true);
  };

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <p className={styles.message}>
        <span aria-hidden="true">🌿</span> {updating ? 'Updating…' : 'A new version is ready!'}
      </p>
      {!updating && (
        <div className={styles.actions}>
          <GameButton variant="ghost" onClick={() => setNeedRefresh(false)}>
            Later
          </GameButton>
          <GameButton variant="primary" onClick={handleUpdate}>
            Update
          </GameButton>
        </div>
      )}
    </div>
  );
}
