import type { AnswerChoice, Question } from '../data/types';
import { generateChoices, isLevelComplete, type RandomSource } from './engine';

export type GameScreen = 'home' | 'question' | 'levelComplete';
export type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';

export interface GameState {
  screen: GameScreen;
  levelNumber: number | null;
  levelSkill: string;
  questions: Question[];
  questionIndex: number;
  choices: AnswerChoice[];
  selectedWord: string | null;
  status: AnswerStatus;
  /** Words already tried and rejected for the current question. */
  incorrectWords: string[];
  attempts: number;
  completedLevels: number[];
}

export const initialGameState: GameState = {
  screen: 'home',
  levelNumber: null,
  levelSkill: '',
  questions: [],
  questionIndex: 0,
  choices: [],
  selectedWord: null,
  status: 'unanswered',
  incorrectWords: [],
  attempts: 0,
  completedLevels: [],
};

export type GameAction =
  | { type: 'SET_COMPLETED_LEVELS'; levels: number[] }
  | { type: 'START_LEVEL'; level: number; skill: string; questions: Question[]; random?: RandomSource }
  | { type: 'SELECT_ANSWER'; word: string }
  | { type: 'ADVANCE_QUESTION'; random?: RandomSource }
  | { type: 'GO_HOME' };

function questionAt(state: GameState, index: number): Question | undefined {
  return state.questions[index];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_COMPLETED_LEVELS':
      return { ...state, completedLevels: action.levels };

    case 'START_LEVEL': {
      if (action.questions.length === 0) {
        return state;
      }
      return {
        ...state,
        screen: 'question',
        levelNumber: action.level,
        levelSkill: action.skill,
        questions: action.questions,
        questionIndex: 0,
        choices: generateChoices(action.questions[0], action.random),
        selectedWord: null,
        status: 'unanswered',
        incorrectWords: [],
        attempts: 0,
      };
    }

    case 'SELECT_ANSWER': {
      if (state.status === 'correct') return state;
      const current = questionAt(state, state.questionIndex);
      if (!current) return state;

      const chosen = state.choices.find((c) => c.word === action.word);
      const wasCorrect = !!chosen?.isCorrect;

      return {
        ...state,
        selectedWord: action.word,
        status: wasCorrect ? 'correct' : 'incorrect',
        attempts: state.attempts + 1,
        incorrectWords: wasCorrect
          ? state.incorrectWords
          : [...new Set([...state.incorrectWords, action.word])],
      };
    }

    case 'ADVANCE_QUESTION': {
      const nextIndex = state.questionIndex + 1;
      const completedCount = nextIndex; // one more question has now been passed
      if (isLevelComplete(completedCount, state.questions.length)) {
        return {
          ...state,
          screen: 'levelComplete',
          selectedWord: null,
          status: 'unanswered',
        };
      }
      const nextQuestion = questionAt(state, nextIndex);
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

    case 'GO_HOME':
      return { ...initialGameState, completedLevels: state.completedLevels };

    default:
      return state;
  }
}
