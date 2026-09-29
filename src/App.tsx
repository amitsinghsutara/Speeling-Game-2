import { getLevelList } from './data/loadContent';
import { useGameEngine } from './game/useGameEngine';
import { ForestBackground } from './components/decorations/ForestBackground';
import { GameHome } from './components/GameHome';
import { QuestionScreen } from './components/QuestionScreen';
import { LevelComplete } from './components/LevelComplete';

function App() {
  const { state, currentQuestion, feedbackHint, startLevel, selectAnswer, nextQuestion, goHome, replayWord } =
    useGameEngine();

  const levels = getLevelList();
  const hasNextLevel = state.levelNumber !== null && levels.some((l) => l.level === state.levelNumber! + 1);

  return (
    <>
      <ForestBackground />

      {state.screen === 'home' && <GameHome completedLevels={state.completedLevels} onStartLevel={startLevel} />}

      {state.screen === 'question' && currentQuestion && (
        <QuestionScreen
          levelNumber={state.levelNumber ?? 1}
          question={currentQuestion}
          questionIndex={state.questionIndex}
          totalQuestions={state.questions.length}
          choices={state.choices}
          selectedWord={state.selectedWord}
          status={state.status}
          incorrectWords={state.incorrectWords}
          feedbackHint={feedbackHint}
          onBack={goHome}
          onReplay={replayWord}
          onSelect={selectAnswer}
          onNext={nextQuestion}
        />
      )}

      {state.screen === 'levelComplete' && state.levelNumber !== null && (
        <LevelComplete
          levelNumber={state.levelNumber}
          skill={state.levelSkill}
          wordCount={state.questions.length}
          hasNextLevel={hasNextLevel}
          onHome={goHome}
          onNextLevel={() => startLevel(state.levelNumber! + 1)}
        />
      )}
    </>
  );
}

export default App;
