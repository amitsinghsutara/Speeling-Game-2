import { AudioButton } from './AudioButton';
import { ProgressBar } from './ProgressBar';
import styles from './GameHeader.module.css';

interface GameHeaderProps {
  levelNumber: number;
  questionNumber: number;
  totalQuestions: number;
  onBack: () => void;
  onReplay: () => void;
}

/** Top navigation for the question screen: back, level/progress, replay. */
export function GameHeader({ levelNumber, questionNumber, totalQuestions, onBack, onReplay }: GameHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back to level select">
          <svg viewBox="0 0 24 24" className={styles.backIcon} aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={styles.titleBlock}>
          <span className={styles.levelLabel}>Level {levelNumber}</span>
          <span className={styles.questionLabel}>
            {questionNumber} / {totalQuestions}
          </span>
        </div>

        <AudioButton onPlay={onReplay} size="sm" label="Play word again" />
      </div>

      <ProgressBar current={questionNumber - 1} total={totalQuestions} showDots={false} />
    </header>
  );
}
