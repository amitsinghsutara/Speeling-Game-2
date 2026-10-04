import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChildProgressState } from '../progress';
import type { ProgressResponse } from '../progress';

const { useChildProgressMock } = vi.hoisted(() => ({ useChildProgressMock: vi.fn() }));
vi.mock('../progress', () => ({
  useChildProgress: useChildProgressMock,
}));

import { ChildProgressScreen } from './ChildProgressScreen';

function sampleData(): ProgressResponse {
  return {
    learnerId: 'abc123',
    generatedAt: '2026-10-04T16:30:00Z',
    overall: { mastery: 0.78, trend: 'improving', summary: 'Your child is making steady progress.' },
    skills: [
      { id: 'initial-consonants', name: 'Initial Sounds', mastery: 0.89, trend: 'strong' },
      { id: 'short-vowels', name: 'Short Vowels', mastery: 0.67, trend: 'improving' },
    ],
    strengths: ['Initial consonant sounds', 'Final consonant sounds'],
    practiceAreas: [
      {
        skillId: 'short-vowels',
        title: 'Short Vowel Sounds',
        description: 'Short vowel sounds are currently more challenging.',
        suggestion: 'Practice words with short /a/ and /i/ sounds.',
      },
    ],
    encouragement: 'Keep encouraging your child.',
  };
}

function setState(state: ChildProgressState, refresh = vi.fn()) {
  useChildProgressMock.mockReturnValue({ state, refresh });
  return refresh;
}

describe('ChildProgressScreen', () => {
  it('shows the loading state without exposing technical language', () => {
    setState({ status: 'loading' });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText('Analyzing progress...')).toBeInTheDocument();
    expect(screen.queryByText(/asking ai/i)).not.toBeInTheDocument();
  });

  it('renders the full summary on success, in parent-friendly language', () => {
    setState({ status: 'ready', data: sampleData() });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText('Your child is making steady progress.')).toBeInTheDocument();
    expect(screen.getByText('Initial Sounds')).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText('Short Vowels')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('Initial consonant sounds')).toBeInTheDocument();
    expect(screen.getByText('Short Vowel Sounds')).toBeInTheDocument();
    expect(screen.getByText('Keep encouraging your child.')).toBeInTheDocument();

    // No internal/technical terminology ever reaches the parent-facing screen.
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/foilType/i);
    expect(bodyText).not.toMatch(/mastery coefficient/i);
    expect(bodyText).not.toMatch(/0\.89/);
  });

  it('shows the empty state for a learner without enough activity yet', () => {
    setState({ status: 'empty' });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText(/just getting started/i)).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/404/)).not.toBeInTheDocument();
  });

  it('shows the offline message when offline with no cached data', () => {
    setState({ status: 'offline', cached: null });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText("You're currently offline.")).toBeInTheDocument();
    expect(screen.getByText(/game progress is safe/i)).toBeInTheDocument();
  });

  it('shows cached data with a clear offline banner when offline but a cache exists', () => {
    setState({ status: 'offline', cached: { data: sampleData(), retrievedAt: '2026-10-01T00:00:00.000Z' } });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText(/you're offline — showing progress from/i)).toBeInTheDocument();
    expect(screen.getByText('Your child is making steady progress.')).toBeInTheDocument();
  });

  it('shows a friendly failure message without technical details when the API fails', () => {
    setState({ status: 'error', cached: null });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText("We couldn't load the latest progress right now.")).toBeInTheDocument();
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/50\d/); // no raw HTTP status codes
    expect(bodyText).not.toMatch(/stack/i);
    expect(bodyText).not.toMatch(/ollama/i);
  });

  it('shows cached data with a clear "could not refresh" banner on API failure', () => {
    setState({ status: 'error', cached: { data: sampleData(), retrievedAt: '2026-10-01T00:00:00.000Z' } });
    render(<ChildProgressScreen onBack={() => {}} />);

    expect(screen.getByText(/couldn't refresh — showing progress from/i)).toBeInTheDocument();
    expect(screen.getByText('Your child is making steady progress.')).toBeInTheDocument();
  });

  it('calls refresh when the refresh control is pressed', () => {
    const refresh = setState({ status: 'ready', data: sampleData() });
    render(<ChildProgressScreen onBack={() => {}} />);

    fireEvent.click(screen.getByText(/Refresh/));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls refresh when "Try Again" is pressed on an error state', () => {
    const refresh = setState({ status: 'error', cached: null });
    render(<ChildProgressScreen onBack={() => {}} />);

    fireEvent.click(screen.getByText(/Try Again/));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when the back button is pressed', () => {
    setState({ status: 'loading' });
    const onBack = vi.fn();
    render(<ChildProgressScreen onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
