import { GameButton } from './GameButton';
import styles from './FeedbackPanel.module.css';

interface FeedbackPanelProps {
  status: 'unanswered' | 'correct' | 'incorrect';
  targetWord: string;
  hint: string;
  onNext: () => void;
}

/** Shows correct/incorrect feedback below the answer grid. Renders nothing while unanswered. */
export function FeedbackPanel({ status, targetWord, hint, onNext }: FeedbackPanelProps) {
  if (status === 'unanswered') return null;

  return (
    <div
      className={`${styles.panel} ${status === 'correct' ? styles.correct : styles.incorrect}`}
      role="status"
      aria-live="polite"
    >
      {status === 'correct' ? (
        <>
          <p className={styles.headline}>Correct!</p>
          <p className={styles.detail}>
            The word is <strong>{targetWord.toUpperCase()}</strong>
          </p>
          <GameButton variant="primary" onClick={onNext} autoFocus>
            Next →
          </GameButton>
        </>
      ) : (
        <>
          <p className={styles.headline}>Not quite!</p>
          <p className={styles.detail}>{hint}</p>
        </>
      )}
    </div>
  );
}
