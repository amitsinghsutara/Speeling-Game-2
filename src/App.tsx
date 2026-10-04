import { getLevelList } from './data/loadContent';
import { useGameEngine } from './game/useGameEngine';
import { useDevMode } from './game/useDevMode';
import { MAX_STARS_PER_PUZZLE, starsForMistakes } from './game/engine';
import { usePwa } from './pwa/PwaProvider';
import { useAppReady } from './pwa/useAppReady';
import { ForestBackground } from './components/decorations/ForestBackground';
import { LoadingScreen } from './components/LoadingScreen';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Welcome } from './components/Welcome';
import { GameHome } from './components/GameHome';
import { PuzzleSelect } from './components/PuzzleSelect';
import { QuestionScreen } from './components/QuestionScreen';
import { PuzzleComplete } from './components/PuzzleComplete';
import { LevelComplete } from './components/LevelComplete';

function App() {
  const {
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
  } = useGameEngine();

  const { offlineReady } = usePwa();
  const ready = useAppReady(offlineReady);
  const { enabled: devMode, registerTap: onTitleTap } = useDevMode();

  const levels = getLevelList();
  const hasNextLevel = state.levelNumber !== null && levels.some((l) => l.level === state.levelNumber! + 1);
  const totalWordsInLevel = state.puzzles.reduce((sum, puzzle) => sum + puzzle.length, 0);
  const starsEarnedForPuzzle = starsForMistakes(state.puzzleMistakes);

  if (!ready) return <LoadingScreen />;

  return (
    <>
      <ForestBackground />
      <UpdatePrompt />

      {state.screen === 'welcome' && <Welcome onPlay={goHome} />}

      {state.screen === 'home' && (
        <GameHome
          puzzleProgress={state.puzzleProgress}
          puzzleStars={state.puzzleStars}
          devMode={devMode}
          onTitleTap={onTitleTap}
          onSelectLevel={selectLevel}
        />
      )}

      {state.screen === 'puzzleSelect' && state.levelNumber !== null && (
        <PuzzleSelect
          levelNumber={state.levelNumber}
          levelSkill={state.levelSkill}
          puzzles={state.puzzles}
          completedPuzzleNumbers={state.puzzleProgress[state.levelNumber] ?? []}
          puzzleStars={state.puzzleStars[state.levelNumber] ?? {}}
          devMode={devMode}
          onSelectPuzzle={startPuzzle}
          onBack={goHome}
        />
      )}

      {state.screen === 'question' && currentQuestion && (
        <QuestionScreen
          levelNumber={state.levelNumber ?? 1}
          puzzleNumber={state.puzzleNumber}
          question={currentQuestion}
          questionIndex={state.questionIndex}
          totalQuestions={state.questions.length}
          choices={state.choices}
          selectedWord={state.selectedWord}
          status={state.status}
          incorrectWords={state.incorrectWords}
          feedbackHint={feedbackHint}
          onBack={backToPuzzleSelect}
          onReplay={replayWord}
          onSelect={selectAnswer}
          onNext={nextQuestion}
        />
      )}

      {state.screen === 'puzzleComplete' && (
        <PuzzleComplete
          puzzleNumber={state.puzzleNumber}
          totalPuzzles={state.puzzles.length}
          starsEarned={starsEarnedForPuzzle}
          maxStars={MAX_STARS_PER_PUZZLE}
          onPuzzleMap={backToPuzzleSelect}
          onNextPuzzle={nextPuzzle}
        />
      )}

      {state.screen === 'levelComplete' && state.levelNumber !== null && (
        <LevelComplete
          levelNumber={state.levelNumber}
          skill={state.levelSkill}
          wordCount={totalWordsInLevel}
          starsEarned={starsEarnedForPuzzle}
          maxStars={MAX_STARS_PER_PUZZLE}
          hasNextLevel={hasNextLevel}
          onHome={goHome}
          onNextLevel={() => selectLevel(state.levelNumber! + 1)}
        />
      )}
    </>
  );
}

export default App;
