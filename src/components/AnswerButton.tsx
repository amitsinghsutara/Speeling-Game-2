import { soundEffectPlayer } from '../game/soundEffects';
import styles from './AnswerButton.module.css';

export type AnswerButtonState = 'idle' | 'correct' | 'wrong' | 'disabled' | 'locked';

interface AnswerButtonProps {
  word: string;
  state: AnswerButtonState;
  onClick: () => void;
}

/** One answer choice in the 2x2 grid. */
export function AnswerButton({ word, state, onClick }: AnswerButtonProps) {
  const statusText = state === 'correct' ? ' (correct answer)' : state === 'wrong' ? ' (not correct, try again)' : '';

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[state]}`}
      onClick={() => {
        soundEffectPlayer.playClick();
        onClick();
      }}
      disabled={state === 'disabled' || state === 'locked' || state === 'correct'}
      aria-label={`${word}${statusText}`}
    >
      <span className={styles.word}>{word}</span>
      {state === 'correct' && (
        <span className={styles.badge} aria-hidden="true">
          ✓
        </span>
      )}
      {(state === 'wrong' || state === 'disabled') && (
        <span className={`${styles.badge} ${styles.badgeWrong}`} aria-hidden="true">
          ✕
        </span>
      )}
    </button>
  );
}
