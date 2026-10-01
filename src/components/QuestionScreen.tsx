import { useEffect, useRef } from 'react';
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
  puzzleNumber: number;
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
  puzzleNumber,
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
  const feedbackRef = useRef<HTMLDivElement>(null);
  const answered = status !== 'unanswered';

  // Safety net for any screen short enough that the compact layout still
  // doesn't fully fit: bring the feedback (and its Next button) into view
  // the moment an answer is given, instead of leaving the learner to find
  // it by scrolling.
  useEffect(() => {
    if (answered) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [answered]);

  return (
    <div className={styles.screen}>
      <GameHeader
        levelNumber={levelNumber}
        puzzleNumber={puzzleNumber}
        questionNumber={questionIndex + 1}
        totalQuestions={totalQuestions}
        onBack={onBack}
        onReplay={onReplay}
      />

      <div className={styles.content}>
        <Mascot mood={mascotMoodFor(status)} size={answered ? 'sm' : 'lg'} className={styles.mascot} />

        <QuestionPrompt onPlay={onReplay} compact={answered} />

        <AnswerGrid
          choices={choices}
          selectedWord={selectedWord}
          status={status}
          incorrectWords={incorrectWords}
          onSelect={onSelect}
        />

        <div ref={feedbackRef}>
          <FeedbackPanel status={status} targetWord={question.target} hint={feedbackHint} onNext={onNext} />
        </div>

        <Confetti active={status === 'correct'} />
      </div>
    </div>
  );
}
