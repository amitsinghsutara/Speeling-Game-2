import type { AnswerChoice, Question } from '../data/types';
import type { PuzzleProgress, PuzzleStars } from './persistence';
import { generateChoices, isLevelComplete, type RandomSource } from './engine';

export type GameScreen = 'welcome' | 'home' | 'puzzleSelect' | 'question' | 'puzzleComplete' | 'levelComplete';
export type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

export interface GameState {
  screen: GameScreen;
  levelNumber: number | null;
  levelSkill: string;
  /** All puzzles (each an ordered list of questions) for the current level. */
  puzzles: Question[][];
  /** 1-indexed puzzle currently being played, or 0 if none is active yet. */
  puzzleNumber: number;
  /** The active puzzle's questions. */
  questions: Question[];
  questionIndex: number;
  choices: AnswerChoice[];
  selectedWord: string | null;
  status: AnswerStatus;
  /** Words already tried and rejected for the current question. */
  incorrectWords: string[];
  attempts: number;
  /** Wrong answers given across the whole current puzzle attempt (resets per puzzle, not per question). */
  puzzleMistakes: number;
  puzzleProgress: PuzzleProgress;
  puzzleStars: PuzzleStars;
}

export const initialGameState: GameState = {
  screen: 'welcome',
  levelNumber: null,
  levelSkill: '',
  puzzles: [],
  puzzleNumber: 0,
  questions: [],
  questionIndex: 0,
  choices: [],
  selectedWord: null,
  status: 'unanswered',
  incorrectWords: [],
  attempts: 0,
  puzzleMistakes: 0,
  puzzleProgress: {},
  puzzleStars: {},
};

export type GameAction =
  | { type: 'SET_PUZZLE_PROGRESS'; progress: PuzzleProgress }
  | { type: 'SET_PUZZLE_STARS'; stars: PuzzleStars }
  | { type: 'SELECT_LEVEL'; level: number; skill: string; puzzles: Question[][] }
  | { type: 'START_PUZZLE'; puzzleNumber: number; random?: RandomSource }
  | { type: 'SELECT_ANSWER'; word: string }
  | { type: 'ADVANCE_QUESTION'; random?: RandomSource }
  | { type: 'NEXT_PUZZLE'; random?: RandomSource }
  | { type: 'BACK_TO_PUZZLE_SELECT' }
  | { type: 'GO_HOME' };

function loadPuzzle(state: GameState, puzzleNumber: number, random: RandomSource | undefined): GameState {
  const questions = state.puzzles[puzzleNumber - 1];
  if (!questions || questions.length === 0) return state;

  return {
    ...state,
    screen: 'question',
    puzzleNumber,
    questions,
    questionIndex: 0,
    choices: generateChoices(questions[0], random),
    selectedWord: null,
    status: 'unanswered',
    incorrectWords: [],
    attempts: 0,
    puzzleMistakes: 0,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PUZZLE_PROGRESS':
      return { ...state, puzzleProgress: action.progress };

    case 'SET_PUZZLE_STARS':
      return { ...state, puzzleStars: action.stars };

    case 'SELECT_LEVEL': {
      if (action.puzzles.length === 0) return state;
      return {
        ...state,
        screen: 'puzzleSelect',
        levelNumber: action.level,
        levelSkill: action.skill,
        puzzles: action.puzzles,
        puzzleNumber: 0,
        questions: [],
        questionIndex: 0,
        selectedWord: null,
        status: 'unanswered',
        incorrectWords: [],
        attempts: 0,
        puzzleMistakes: 0,
      };
    }

    case 'START_PUZZLE':
      return loadPuzzle(state, action.puzzleNumber, action.random);

    case 'SELECT_ANSWER': {
      if (state.status === 'correct') return state;
      const current = state.questions[state.questionIndex];
      if (!current) return state;

      const chosen = state.choices.find((c) => c.word === action.word);
      const wasCorrect = !!chosen?.isCorrect;

      return {
        ...state,
        selectedWord: action.word,
        status: wasCorrect ? 'correct' : 'incorrect',
        attempts: state.attempts + 1,
        puzzleMistakes: wasCorrect ? state.puzzleMistakes : state.puzzleMistakes + 1,
        incorrectWords: wasCorrect
          ? state.incorrectWords
          : [...new Set([...state.incorrectWords, action.word])],
      };
    }

    case 'ADVANCE_QUESTION': {
      const nextIndex = state.questionIndex + 1;
      if (isLevelComplete(nextIndex, state.questions.length)) {
        const isLastPuzzle = state.puzzleNumber >= state.puzzles.length;
        return {
          ...state,
          screen: isLastPuzzle ? 'levelComplete' : 'puzzleComplete',
          selectedWord: null,
          status: 'unanswered',
        };
      }
      const nextQuestion = state.questions[nextIndex];
      if (!nextQuestion) return state;
      return {
        ...state,
        questionIndex: nextIndex,
        choices: generateChoices(nextQuestion, action.random),
        selectedWord: null,
        status: 'unanswered',
        incorrectWords: [],
        attempts: 0,
      };
    }

    case 'NEXT_PUZZLE':
      return loadPuzzle(state, state.puzzleNumber + 1, action.random);

    case 'BACK_TO_PUZZLE_SELECT':
      return {
        ...state,
        screen: 'puzzleSelect',
        puzzleNumber: 0,
        questions: [],
        questionIndex: 0,
        selectedWord: null,
        status: 'unanswered',
        incorrectWords: [],
        attempts: 0,
        puzzleMistakes: 0,
      };

    case 'GO_HOME':
      return { ...initialGameState, screen: 'home', puzzleProgress: state.puzzleProgress, puzzleStars: state.puzzleStars };

    default:
      return state;
  }
}
