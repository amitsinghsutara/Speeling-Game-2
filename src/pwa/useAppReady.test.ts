import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppReady } from './useAppReady';

describe('useAppReady', () => {
  let cachedStatusCalls: boolean[];

  beforeEach(() => {
    cachedStatusCalls = [];
    window.Android = { cachedStatus: (v) => cachedStatusCalls.push(v) };
  });

  afterEach(() => {
    delete window.Android;
    vi.unstubAllGlobals();
  });

  it('is ready immediately and does not notify Android when service workers are unsupported', () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined });

    const { result } = renderHook(() => useAppReady(false));

    expect(result.current).toBe(true);
    expect(cachedStatusCalls).toEqual([]);
  });

  it('is ready immediately and notifies Android when a prior visit already controls the page', () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { controller: {} } });

    const { result } = renderHook(() => useAppReady(false));

    expect(result.current).toBe(true);
    expect(cachedStatusCalls).toEqual([true]);
  });

  it('becomes ready and notifies Android once offlineReady flips to true', () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} });

    const { result, rerender } = renderHook(({ offlineReady }) => useAppReady(offlineReady), {
      initialProps: { offlineReady: false },
    });

    expect(result.current).toBe(false);
    expect(cachedStatusCalls).toEqual([]);

    rerender({ offlineReady: true });

    expect(result.current).toBe(true);
    expect(cachedStatusCalls).toEqual([true]);
  });
});
