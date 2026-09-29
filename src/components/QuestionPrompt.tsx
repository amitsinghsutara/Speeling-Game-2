import { AudioButton } from './AudioButton';
import styles from './QuestionPrompt.module.css';

interface QuestionPromptProps {
  onPlay: () => void;
}

/** The "listen and choose" instruction plus the primary large speaker button. */
export function QuestionPrompt({ onPlay }: QuestionPromptProps) {
  return (
    <div className={styles.wrapper}>
      <p className={styles.instruction}>Listen and choose the correct spelling.</p>
      <AudioButton onPlay={onPlay} size="lg" label="Play the word" />
    </div>
  );
}
