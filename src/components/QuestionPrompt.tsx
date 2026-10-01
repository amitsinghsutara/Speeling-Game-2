import { AudioButton } from './AudioButton';
import styles from './QuestionPrompt.module.css';

interface QuestionPromptProps {
  onPlay: () => void;
  /** Shrinks the prompt once a question has been answered, so the feedback
   * below it fits on screen without scrolling. */
  compact?: boolean;
}

/** The "listen and choose" instruction plus the primary large speaker button. */
export function QuestionPrompt({ onPlay, compact = false }: QuestionPromptProps) {
  return (
    <div className={styles.wrapper}>
      {!compact && <p className={styles.instruction}>Listen and choose the correct spelling.</p>}
      <AudioButton onPlay={onPlay} size={compact ? 'sm' : 'lg'} label="Play the word" />
    </div>
  );
}
