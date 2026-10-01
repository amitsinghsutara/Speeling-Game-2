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

function puzzlesOf(...questionLists: Question[][]): Question[][] {
  return questionLists;
}

function selectedLevelState(puzzles: Question[][]): GameState {
  return gameReducer(initialGameState, {
    type: 'SELECT_LEVEL',
    level: 1,
    skill: 'CVC, short vowels',
    puzzles,
  });
}

function startedPuzzleState(puzzles: Question[][], puzzleNumber = 1): GameState {
  const selected = selectedLevelState(puzzles);
  return gameReducer(selected, { type: 'START_PUZZLE', puzzleNumber, random: fixedRandom });
}

describe('gameReducer: selecting a level', () => {
  it('moves to the puzzle-select screen with all of the level puzzles loaded', () => {
    const puzzles = puzzlesOf([question({ sequence: 1, target: 'sat' })], [question({ sequence: 2, target: 'mat' })]);
    const state = selectedLevelState(puzzles);

    expect(state.screen).toBe('puzzleSelect');
    expect(state.levelNumber).toBe(1);
    expect(state.puzzles).toHaveLength(2);
    expect(state.puzzleNumber).toBe(0);
  });

  it('does nothing if the level has no puzzles', () => {
    const state = gameReducer(initialGameState, {
      type: 'SELECT_LEVEL',
      level: 1,
      skill: 'Empty',
      puzzles: [],
    });
    expect(state).toEqual(initialGameState);
  });
});

describe('gameReducer: starting a puzzle', () => {
  it('loads the first question of the chosen puzzle', () => {
    const puzzles = puzzlesOf([question({ sequence: 1, target: 'sat' })], [question({ sequence: 2, target: 'mat' })]);
    const state = startedPuzzleState(puzzles, 2);

    expect(state.screen).toBe('question');
    expect(state.puzzleNumber).toBe(2);
    expect(state.questions[0].target).toBe('mat');
    expect(state.choices).toHaveLength(4);
    expect(state.status).toBe('unanswered');
  });

  it('does nothing if the requested puzzle number does not exist', () => {
    const puzzles = puzzlesOf([question()]);
    const selected = selectedLevelState(puzzles);
    const state = gameReducer(selected, { type: 'START_PUZZLE', puzzleNumber: 5 });
    expect(state).toEqual(selected);
  });
});

describe('gameReducer: answering questions', () => {
  it('marks the state correct when the target word is selected', () => {
    const state = startedPuzzleState(puzzlesOf([question()]));
    const next = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    expect(next.status).toBe('correct');
    expect(next.selectedWord).toBe('sat');
    expect(next.attempts).toBe(1);
  });

  it('marks the state incorrect when a foil is selected, and stays on the question', () => {
    const state = startedPuzzleState(puzzlesOf([question()]));
    const next = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sit' });
    expect(next.status).toBe('incorrect');
    expect(next.screen).toBe('question');
    expect(next.questionIndex).toBe(0);
    expect(next.incorrectWords).toContain('sit');
  });

  it('supports retrying after an incorrect answer until the correct one is found', () => {
    let state = startedPuzzleState(puzzlesOf([question()]));
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
    let state = startedPuzzleState(puzzlesOf([question()]));
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    const afterCorrect = state;
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sit' });
    expect(state).toEqual(afterCorrect);
  });
});

describe('gameReducer: question progression within a puzzle', () => {
  it('advances to the next question in the same puzzle and resets per-question state', () => {
    const puzzle = [question({ sequence: 1, target: 'sat' }), question({ sequence: 2, target: 'mat' })];
    let state = startedPuzzleState(puzzlesOf(puzzle));
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION', random: fixedRandom });

    expect(state.screen).toBe('question');
    expect(state.puzzleNumber).toBe(1);
    expect(state.questionIndex).toBe(1);
    expect(state.status).toBe('unanswered');
    expect(state.selectedWord).toBeNull();
    expect(state.incorrectWords).toEqual([]);
    expect(state.choices.some((c) => c.word === 'mat' && c.isCorrect)).toBe(true);
  });
});

describe('gameReducer: puzzle completion', () => {
  it('moves to puzzleComplete after the last question of a non-final puzzle', () => {
    const puzzles = puzzlesOf([question({ sequence: 1, target: 'sat' })], [question({ sequence: 2, target: 'mat' })]);
    let state = startedPuzzleState(puzzles, 1);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });

    expect(state.screen).toBe('puzzleComplete');
    expect(state.puzzleNumber).toBe(1);
  });

  it('moves to levelComplete after the last question of the final puzzle', () => {
    const puzzles = puzzlesOf([question({ sequence: 1, target: 'sat' })], [question({ sequence: 2, target: 'mat' })]);
    let state = startedPuzzleState(puzzles, 2);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'mat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });

    expect(state.screen).toBe('levelComplete');
  });

  it('does not complete the puzzle before its last question', () => {
    const puzzle = [question({ sequence: 1, target: 'sat' }), question({ sequence: 2, target: 'mat' })];
    let state = startedPuzzleState(puzzlesOf(puzzle));
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });

    expect(state.screen).toBe('question');
  });

  it('NEXT_PUZZLE loads the following puzzle after a puzzleComplete screen', () => {
    const puzzles = puzzlesOf([question({ sequence: 1, target: 'sat' })], [question({ sequence: 2, target: 'mat' })]);
    let state = startedPuzzleState(puzzles, 1);
    state = gameReducer(state, { type: 'SELECT_ANSWER', word: 'sat' });
    state = gameReducer(state, { type: 'ADVANCE_QUESTION' });
    expect(state.screen).toBe('puzzleComplete');

    state = gameReducer(state, { type: 'NEXT_PUZZLE', random: fixedRandom });
    expect(state.screen).toBe('question');
    expect(state.puzzleNumber).toBe(2);
    expect(state.questions[0].target).toBe('mat');
  });
});

describe('gameReducer: navigation', () => {
  it('BACK_TO_PUZZLE_SELECT returns to the puzzle map for the current level', () => {
    const puzzles = puzzlesOf([question()]);
    let state = startedPuzzleState(puzzles);
    state = gameReducer(state, { type: 'BACK_TO_PUZZLE_SELECT' });

    expect(state.screen).toBe('puzzleSelect');
    expect(state.levelNumber).toBe(1);
    expect(state.puzzleNumber).toBe(0);
  });

  it('GO_HOME returns home while preserving puzzle progress', () => {
    const puzzles = puzzlesOf([question()]);
    let state = startedPuzzleState(puzzles);
    state = gameReducer(state, { type: 'SET_PUZZLE_PROGRESS', progress: { 1: [1] } });
    state = gameReducer(state, { type: 'GO_HOME' });

    expect(state.screen).toBe('home');
    expect(state.puzzleProgress).toEqual({ 1: [1] });
  });

  it('starts on the welcome screen before any action is dispatched', () => {
    expect(initialGameState.screen).toBe('welcome');
  });

  it('GO_HOME moves from the welcome screen straight to home, not back to welcome', () => {
    const state = gameReducer(initialGameState, { type: 'GO_HOME' });
    expect(state.screen).toBe('home');
  });
});
