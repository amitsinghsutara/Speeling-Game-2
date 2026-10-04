/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Base URL of the AI Learning Engine's event API, e.g. http://localhost:3000 */
  readonly VITE_LEARNING_ENGINE_URL?: string;
  /** Set to "false" to disable learning-event collection/sync entirely. */
  readonly VITE_LEARNING_SYNC_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
