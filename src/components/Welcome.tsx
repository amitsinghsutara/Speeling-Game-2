import { Mascot } from './Mascot';
import { Stars } from './decorations/Stars';
import { GameButton } from './GameButton';
import styles from './Welcome.module.css';

interface WelcomeProps {
  onPlay: () => void;
}

/** The very first screen shown when the game loads: title, mascot, and a way in. */
export function Welcome({ onPlay }: WelcomeProps) {
  return (
    <div className={styles.screen}>
      <Stars count={3} />

      <div className={styles.titleBoard}>
        <h1 className={styles.title}>Forest Spelling Adventure</h1>
      </div>

      <Mascot mood="excited" className={styles.mascot} />

      <p className={styles.tagline}>Listen closely, spell it right, and explore the forest with Fern!</p>

      <GameButton variant="primary" onClick={onPlay} className={styles.playButton}>
        Play →
      </GameButton>
    </div>
  );
}
