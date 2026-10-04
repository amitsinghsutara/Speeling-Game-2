import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressResponse } from './types';

const { getLearnerProgressMock, getCachedProgressMock, setCachedProgressMock } = vi.hoisted(() => ({
  getLearnerProgressMock: vi.fn(),
  getCachedProgressMock: vi.fn(),
  setCachedProgressMock: vi.fn(),
}));

vi.mock('../learning', () => ({
  getLearnerId: () => 'learner-1',
}));
vi.mock('./progressApiClient', () => ({
  progressApiClient: { getLearnerProgress: getLearnerProgressMock },
}));
vi.mock('./progressCache', () => ({
  getCachedProgress: getCachedProgressMock,
  setCachedProgress: setCachedProgressMock,
}));

import { useChildProgress } from './useChildProgress';

function sampleData(overrides: Partial<ProgressResponse> = {}): ProgressResponse {
  return {
    learnerId: 'learner-1',
    generatedAt: '2026-10-04T16:30:00Z',
    overall: { mastery: 0.78, trend: 'improving', summary: 'Great progress!' },
    skills: [{ id: 'short-vowels', name: 'Short Vowels', mastery: 0.67, trend: 'improving' }],
    strengths: [],
    practiceAreas: [],
    encouragement: 'Keep it up.',
    ...overrides,
  };
}

describe('useChildProgress', () => {
  beforeEach(() => {
    getLearnerProgressMock.mockReset();
    getCachedProgressMock.mockReset().mockReturnValue(null);
    setCachedProgressMock.mockReset();
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in the loading state', () => {
    getLearnerProgressMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useChildProgress());
    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('shows the summary once the fetch succeeds', async () => {
    getLearnerProgressMock.mockResolvedValue({ status: 'success', data: sampleData() });
    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toEqual({ status: 'ready', data: sampleData() });
    expect(setCachedProgressMock).toHaveBeenCalledWith(sampleData(), expect.any(String));
  });

  it('shows the empty state when the learner has no tracked skills yet', async () => {
    getLearnerProgressMock.mockResolvedValue({ status: 'success', data: sampleData({ skills: [] }) });
    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'empty' }));
  });

  it('goes straight to the offline state without calling the API when offline', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    getCachedProgressMock.mockReturnValue(null);

    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'offline', cached: null }));
    expect(getLearnerProgressMock).not.toHaveBeenCalled();
  });

  it('surfaces cached data alongside the offline state when a cache exists', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    const cached = { data: sampleData(), retrievedAt: '2026-10-01T00:00:00.000Z' };
    getCachedProgressMock.mockReturnValue(cached);

    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'offline', cached }));
  });

  it('falls back to the error state without cached data when the fetch fails', async () => {
    getLearnerProgressMock.mockResolvedValue({ status: 'network-error' });
    getCachedProgressMock.mockReturnValue(null);

    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', cached: null }));
  });

  it('surfaces cached data alongside the error state when a cache exists', async () => {
    getLearnerProgressMock.mockResolvedValue({ status: 'server-error', httpStatus: 500 });
    const cached = { data: sampleData(), retrievedAt: '2026-10-01T00:00:00.000Z' };
    getCachedProgressMock.mockReturnValue(cached);

    const { result } = renderHook(() => useChildProgress());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', cached }));
  });

  it('refresh re-fetches and can move from error to ready', async () => {
    getLearnerProgressMock.mockResolvedValueOnce({ status: 'network-error' });
    getCachedProgressMock.mockReturnValue(null);

    const { result } = renderHook(() => useChildProgress());
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    getLearnerProgressMock.mockResolvedValueOnce({ status: 'success', data: sampleData() });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state).toEqual({ status: 'ready', data: sampleData() });
    expect(getLearnerProgressMock).toHaveBeenCalledTimes(2);
  });

  it('only ever sends the anonymous learner id — never a name, email, or other identifier', async () => {
    getLearnerProgressMock.mockResolvedValue({ status: 'success', data: sampleData() });
    renderHook(() => useChildProgress());

    await waitFor(() => expect(getLearnerProgressMock).toHaveBeenCalledTimes(1));
    expect(getLearnerProgressMock).toHaveBeenCalledWith('learner-1');
  });
});
