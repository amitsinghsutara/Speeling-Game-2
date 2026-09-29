import type { Question, AnswerChoice } from '../data/types';
import { GameHeader } from './GameHeader';
import { QuestionPrompt } from './QuestionPrompt';
import { AnswerGrid } from './AnswerGrid';
import { FeedbackPanel } from './FeedbackPanel';
import { Mascot, type MascotMood } from './Mascot';
import { Confetti } from './decorations/Confetti';
import styles from './QuestionScreen.module.css';

interface QuestionScreenProps {
  levelNumber: number;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  choices: AnswerChoice[];
  selectedWord: string | null;
  status: 'unanswered' | 'correct' | 'incorrect';
  incorrectWords: string[];
  feedbackHint: string;
  onBack: () => void;
  onReplay: () => void;
  onSelect: (word: string) => void;
  onNext: () => void;
}

function mascotMoodFor(status: 'unanswered' | 'correct' | 'incorrect'): MascotMood {
  if (status === 'correct') return 'excited';
  if (status === 'incorrect') return 'encouraging';
  return 'thinking';
}

export function QuestionScreen({
  levelNumber,
  question,
  questionIndex,
  totalQuestions,
  choices,
  selectedWord,
  status,
  incorrectWords,
  feedbackHint,
  onBack,
  onReplay,
  onSelect,
  onNext,
}: QuestionScreenProps) {
  return (
    <div className={styles.screen}>
      <GameHeader
        levelNumber={levelNumber}
        questionNumber={questionIndex + 1}
        totalQuestions={totalQuestions}
        onBack={onBack}
        onReplay={onReplay}
      />

      <div className={styles.content}>
        <Mascot mood={mascotMoodFor(status)} className={styles.mascot} />

        <QuestionPrompt onPlay={onReplay} />

        <AnswerGrid
          choices={choices}
          selectedWord={selectedWord}
          status={status}
          incorrectWords={incorrectWords}
          onSelect={onSelect}
        />

        <FeedbackPanel status={status} targetWord={question.target} hint={feedbackHint} onNext={onNext} />

        <Confetti active={status === 'correct'} />
      </div>
    </div>
  );
}
