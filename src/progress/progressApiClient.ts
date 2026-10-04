/**
 * HTTP client for the AI Learning Engine's progress-summary API. This is the
 * only place in the game that knows the engine's URL or response shape.
 * Every outcome — success, down server, bad network, slow response, garbage
 * payload — resolves to a `ProgressFetchResult` instead of throwing, so
 * callers never need a try/catch to stay safe.
 */
import { progressResponseSchema, type ProgressApiClient, type ProgressFetchResult } from './types';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 10_000;

function getBaseUrl(): string {
  return import.meta.env.VITE_LEARNING_ENGINE_URL ?? DEFAULT_BASE_URL;
}

class HttpProgressApiClient implements ProgressApiClient {
  async getLearnerProgress(learnerId: string): Promise<ProgressFetchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch(`${getBaseUrl()}/api/v1/learners/${encodeURIComponent(learnerId)}/progress`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { status: 'timeout' };
        }
        return { status: 'network-error' };
      }

      if (!response.ok) {
        return { status: 'server-error', httpStatus: response.status };
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        return { status: 'invalid-response' };
      }

      const parsed = progressResponseSchema.safeParse(json);
      if (!parsed.success) {
        return { status: 'invalid-response' };
      }

      return { status: 'success', data: parsed.data };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const progressApiClient: ProgressApiClient = new HttpProgressApiClient();
