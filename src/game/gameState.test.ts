import { describe, expect, it } from 'vitest';
import type { Question } from '../data/types';
import { gameReducer, initialGameState, type GameState } from './gameState';

function question(overrides: Partial<Question> = {}): Question {
  return {
    level: 1,
    item: 1,
    sequence: 1,
    skill: 'CVC, short vowels',
    target: 'sat',
    foils: [
      { word: 'sit', type: 'V' },
      { word: 'sap', type: 'FC' },
      { word: 'hat', type: 'IC' },
    ],
    ...overrides,
  };
}

const fixedRandom = () => 0; // deterministic ordering for assertions

describe('gameReducer: starting a level', () => {
  it('loads the first question and resets per-question state', () => {
    const questions = [question({ sequence: 1, target: 'sat' }), question({ sequence: 2, target: 'mat' })];
    const state = gameReducer(initialGameState, {
      type: 'START_LEVEL',
      level: 1,
      skill: 'CVC, short vowels',
      questions,
      random: fixedRandom,
    });

    expect(state.screen).toBe('question');
    expect(state.questionIndex).toBe(0);
    expect(state.choices).toHaveLength(4);
    expect(state.status).toBe('unanswered');
    expect(state.selectedWord).toBeNull();
  });

  it('does nothing if the level has no questions', () => {
    const state = gameReducer(initialGameState, {
      type: 'START_LEVEL',
      level: 1,
      skill: 'Empty',
      questions: [],
    });
    expect(state).toEqual(initialGameState);
  });
});

function startedState(questions: Question[]): GameState {
  return gameReducer(initialGameState, {
    type: 'START_LEVEL',
    level: 1,
    skill: 'CVC, short vowels',
    questions,
    random: fixedRandom,
  });
}

describe('gameReducer: answering questions', () => {
  it('marks the state correct when the target word is selected', () => {
    const state = startedState([question()]);
    const next = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    expect(next.status).toBe('correct');
    expect(next.selectedWord).toBe('sat');
    expect(next.attempts).toBe(1);
  });

  it('marks the state incorrect when a foil is selected, and stays on the question', () => {
    const state = startedState([question()]);
    const next = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sit' });
    expect(next.status).toBe('incorrect');
    expect(next.screen).toBe('question');
    expect(next.questionIndex).toBe(0);
    expect(next.incorrectWords).toContain('sit');
  });

  it('supports retrying after an incorrect answer until the correct one is found', () => {
    let state = startedState([question()]);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sit' });
    expect(state.status).toBe('incorrect');

    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'hat' });
    expect(state.status).toBe('incorrect');
    expect(state.incorrectWords).toEqual(expect.arrayContaining(['sit', 'hat']));

    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    expect(state.status).toBe('correct');
    expect(state.attempts).toBe(3);
  });

  it('ignores further selections once the question has been answered correctly', () => {
    let state = startedState([question()]);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    const afterCorrect = state;
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sit' });
    expect(state).toEqual(afterCorrect);
  });
});

describe('gameReducer: question progression', () => {
  it('advances to the next question and resets per-question state', () => {
    const questions = [question({ sequence: 1, target: 'sat' }), question({ sequence: 2, target: 'mat' })];
    let state = startedState(questions);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION', random: fixedRandom });

    expect(state.screen).toBe('question');
    expect(state.questionIndex).toBe(1);
    expect(state.status).toBe('unanswered');
    expect(state.selectedWord).toBeNull();
    expect(state.incorrectWords).toEqual([]);
    expect(state.choices.some((c) => c.word === 'mat' && c.isCorrect)).toBe(true);
  });
});

describe('gameReducer: level completion', () => {
  it('moves to the levelComplete screen after the last question', () => {
    const questions = [question({ sequence: 1, target: 'sat' })];
    let state = startedState(questions);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });

    expect(state.screen).toBe('levelComplete');
  });

  it('does not complete the level before the last question', () => {
    const questions = [question({ sequence: 1, target: 'sat' }), question({ sequence: 2, target: 'mat' })];
    let state = startedState(questions);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });

    expect(state.screen).toBe('question');
  });
});

describe('gameReducer: navigation', () => {
  it('returns home while preserving completed-level progress', () => {
    const questions = [question()];
    let state = startedState(questions);
    state = gameReducer(state, { type: 'SET_COMPLETED_LEVELS', levels: [1] });
    state = gameReducer(state, { type: 'GO_HOME' });

    expect(state.screen).toBe('home');
    expect(state.completedLevels).toEqual([1]);
  });
});
