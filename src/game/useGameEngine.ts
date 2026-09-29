import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getQuestionsForLevel, getLevelList } from '../data/loadContent';
import { wordAudioPlayer } from './audio';
import { getFeedbackHint } from './engine';
import { progressStore } from './persistence';
import { gameReducer, initialGameState } from './gameState';

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const hasMarkedCompleteRef = useRef(false);

  useEffect(() => {
    dispatch({ type: 'SET_COMPLETED_LEVELS', levels: progressStore.getCompletedLevels() });
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
  }, [state.screen, state.questionIndex, state.levelNumber]);

  // Persist level completion exactly once per level clear.
  useEffect(() => {
    if (state.screen === 'levelComplete' && state.levelNumber !== null && !hasMarkedCompleteRef.current) {
      hasMarkedCompleteRef.current = true;
      progressStore.markLevelComplete(state.levelNumber);
      dispatch({ type: 'SET_COMPLETED_LEVELS', levels: progressStore.getCompletedLevels() });
    }
    if (state.screen !== 'levelComplete') {
      hasMarkedCompleteRef.current = false;
    }
  }, [state.screen, state.levelNumber]);

  const startLevel = useCallback((level: number) => {
    const levelInfo = getLevelList().find((l) => l.level === level);
    const questions = getQuestionsForLevel(level);
    dispatch({
      type: 'START_LEVEL',
      level,
      skill: levelInfo?.skill ?? '',
      questions,
    });
  }, []);

  const selectAnswer = useCallback((word: string) => {
    dispatch({ type: 'SELECT_ANSWER', word });
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'ADVANCE_QUESTION' });
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
    startLevel,
    selectAnswer,
    nextQuestion,
    goHome,
    replayWord,
  };
}
