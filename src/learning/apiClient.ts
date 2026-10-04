/**
 * HTTP client for the AI Learning Engine's event ingestion API. This is the
 * ONLY place that knows the engine's URL or request shape — everything else
 * in the game talks to the local queue, never the network, directly.
 */
import type { LearningEvent } from './types';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function getBaseUrl(): string {
  return import.meta.env.VITE_LEARNING_ENGINE_URL ?? DEFAULT_BASE_URL;
}

/** Master on/off switch. When disabled, the game behaves as if sync never succeeds. */
export function isLearningSyncEnabled(): boolean {
  return import.meta.env.VITE_LEARNING_SYNC_ENABLED !== 'false';
}

export interface LearningApiClient {
  /** Resolves true only on a 2xx response. Never throws — network/parse failures resolve false. */
  sendEvent(event: LearningEvent): Promise<boolean>;
}

class HttpLearningApiClient implements LearningApiClient {
  async sendEvent(event: LearningEvent): Promise<boolean> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      return response.ok;
    } catch {
      // Offline, DNS failure, CORS, server down, etc. — treated uniformly as
      // "couldn't deliver this time," which the sync manager retries later.
      return false;
    }
  }
}

export const learningApiClient: LearningApiClient = new HttpLearningApiClient();
