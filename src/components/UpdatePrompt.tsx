import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { GameButton } from './GameButton';
import styles from './UpdatePrompt.module.css';

/** How often an already-open tab re-checks for a new deploy in the background. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Small banner that appears once a new version of the game has finished
 * downloading in the background. Nothing updates silently — the learner
 * (or the adult with them) chooses when to refresh, so an update never
 * interrupts an answer mid-question.
 *
 * A browser only checks for a new service worker on navigation by default.
 * A long-lived single tab (the common case — most players never hard-reload)
 * would otherwise never notice a new deploy, so this also re-checks on an
 * interval and whenever the tab becomes visible again. Those checks are
 * watched with the registration's own native `updatefound`/`statechange`
 * events directly, rather than relying on the "waiting" event workbox-window
 * sets up for its own registration-time flow — that one doesn't reliably
 * fire for an update() call triggered later from a long-lived tab.
 */
export function UpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      setRegistration(reg ?? null);
    },
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!registration) return;

    const watchInstallingWorker = () => {
      const installing = registration.installing;
      if (!installing) return;
      const onStateChange = () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          setNeedRefresh(true);
        }
      };
      installing.addEventListener('statechange', onStateChange);
    };
    registration.addEventListener('updatefound', watchInstallingWorker);

    const checkForUpdate = () => registration.update().catch(() => {});
    const intervalId = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      registration.removeEventListener('updatefound', watchInstallingWorker);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [registration, setNeedRefresh]);

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
