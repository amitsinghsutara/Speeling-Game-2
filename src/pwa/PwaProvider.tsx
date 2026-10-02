import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PwaContextValue {
  registration: ServiceWorkerRegistration | null;
  /** True once the active service worker has finished precaching everything needed to play offline. */
  offlineReady: boolean;
  needRefresh: boolean;
  setNeedRefresh: (value: boolean) => void;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

/**
 * Registers the service worker exactly once and shares its state with
 * whichever components care: the loading gate (offlineReady) and the
 * update banner (needRefresh). Registering more than once per page would
 * fire duplicate `onRegisteredSW`/`onOfflineReady` callbacks.
 */
export function PwaProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      setRegistration(reg ?? null);
    },
  });

  return (
    <PwaContext.Provider value={{ registration, offlineReady, needRefresh, setNeedRefresh, updateServiceWorker }}>
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used within a PwaProvider');
  return ctx;
}
