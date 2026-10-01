import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getPuzzlesForLevel, getLevelList } from '../data/loadContent';
import { wordAudioPlayer } from './audio';
import { getFeedbackHint } from './engine';
import { progressStore } from './persistence';
import { gameReducer, initialGameState } from './gameState';

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const lastMarkedPuzzleRef = useRef<string | null>(null);

  useEffect(() => {
    dispatch({ type: 'SET_PUZZLE_PROGRESS', progress: progressStore.getProgress() });
  }, []);

  const currentQuestion = state.questions[state.questionIndex];

  // Speak the target word automatically whenever a new question appears.
  useEffect(() => {
    if (state.screen === 'question' && currentQuestion) {
      wordAudioPlayer.playWord(currentQuestion.target);
    }
    return () => {
      wordAudioPlayer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.screen, state.questionIndex, state.puzzleNumber, state.levelNumber]);

  // Persist puzzle completion exactly once per puzzle clear.
  useEffect(() => {
    const isPuzzleFinishedScreen = state.screen === 'puzzleComplete' || state.screen === 'levelComplete';
    const puzzleKey = `${state.levelNumber}:${state.puzzleNumber}`;

    if (isPuzzleFinishedScreen && state.levelNumber !== null && lastMarkedPuzzleRef.current !== puzzleKey) {
      lastMarkedPuzzleRef.current = puzzleKey;
      progressStore.markPuzzleComplete(state.levelNumber, state.puzzleNumber);
      dispatch({ type: 'SET_PUZZLE_PROGRESS', progress: progressStore.getProgress() });
    }
    if (!isPuzzleFinishedScreen) {
      lastMarkedPuzzleRef.current = null;
    }
  }, [state.screen, state.levelNumber, state.puzzleNumber]);

  const selectLevel = useCallback((level: number) => {
    const levelInfo = getLevelList().find((l) => l.level === level);
    const puzzles = getPuzzlesForLevel(level);
    dispatch({ type: 'SELECT_LEVEL', level, skill: levelInfo?.skill ?? '', puzzles });
  }, []);

  const startPuzzle = useCallback((puzzleNumber: number) => {
    dispatch({ type: 'START_PUZZLE', puzzleNumber });
  }, []);

  const selectAnswer = useCallback((word: string) => {
    dispatch({ type: 'SELECT_ANSWER', word });
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'ADVANCE_QUESTION' });
  }, []);

  const nextPuzzle = useCallback(() => {
    dispatch({ type: 'NEXT_PUZZLE' });
  }, []);

  const backToPuzzleSelect = useCallback(() => {
    dispatch({ type: 'BACK_TO_PUZZLE_SELECT' });
  }, []);

  const goHome = useCallback(() => {
    dispatch({ type: 'GO_HOME' });
  }, []);

  const replayWord = useCallback(() => {
    if (currentQuestion) {
      wordAudioPlayer.playWord(currentQuestion.target);
    }
  }, [currentQuestion]);

  const feedbackHint =
    state.status === 'incorrect' && currentQuestion && state.selectedWord
      ? getFeedbackHint(currentQuestion, state.selectedWord)
      : '';

  return {
    state,
    currentQuestion,
    feedbackHint,
    selectLevel,
    startPuzzle,
    selectAnswer,
    nextQuestion,
    nextPuzzle,
    backToPuzzleSelect,
    goHome,
    replayWord,
  };
}
