import { afterEach, describe, expect, it, vi } from 'vitest';
import { progressApiClient } from './progressApiClient';

function validPayload() {
  return {
    learnerId: 'abc123',
    generatedAt: '2026-10-04T16:30:00Z',
    overall: { mastery: 0.78, trend: 'improving', summary: 'Great progress!' },
    skills: [{ id: 'short-vowels', name: 'Short Vowels', mastery: 0.67, trend: 'improving' }],
    strengths: [],
    practiceAreas: [],
    encouragement: 'Keep it up.',
  };
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('progressApiClient.getLearnerProgress', () => {
  it('resolves success with the validated payload on a 200 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(validPayload()));
    vi.stubGlobal('fetch', fetchMock);

    const result = await progressApiClient.getLearnerProgress('abc123');

    expect(result).toEqual({ status: 'success', data: validPayload() });
  });

  it('requests the correct URL and only sends the learner id, no personal data or credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(validPayload()));
    vi.stubGlobal('fetch', fetchMock);

    await progressApiClient.getLearnerProgress('abc 123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/learners/abc%20123/progress');
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
    expect(options.headers).toEqual({ Accept: 'application/json' });
  });

  it('resolves network-error when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    const result = await progressApiClient.getLearnerProgress('abc123');

    expect(result).toEqual({ status: 'network-error' });
  });

  it('resolves server-error with the status code on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const result = await progressApiClient.getLearnerProgress('abc123');

    expect(result).toEqual({ status: 'server-error', httpStatus: 503 });
  });

  it('resolves invalid-response when the body fails schema validation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ nonsense: true })));

    const result = await progressApiClient.getLearnerProgress('abc123');

    expect(result).toEqual({ status: 'invalid-response' });
  });

  it('resolves invalid-response when the body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );

    const result = await progressApiClient.getLearnerProgress('abc123');

    expect(result).toEqual({ status: 'invalid-response' });
  });

  it('resolves timeout when the request takes too long', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );

    const resultPromise = progressApiClient.getLearnerProgress('abc123');
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(resultPromise).resolves.toEqual({ status: 'timeout' });
  });
});
