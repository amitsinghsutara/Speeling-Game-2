import { Mascot } from './Mascot';
import { Stars } from './decorations/Stars';
import { Confetti } from './decorations/Confetti';
import { ProgressBar } from './ProgressBar';
import { GameButton } from './GameButton';
import styles from './LevelComplete.module.css';

interface LevelCompleteProps {
  levelNumber: number;
  skill: string;
  wordCount: number;
  starsEarned: number;
  maxStars: number;
  hasNextLevel: boolean;
  onHome: () => void;
  onNextLevel: () => void;
}

export function LevelComplete({
  levelNumber,
  skill,
  wordCount,
  starsEarned,
  maxStars,
  hasNextLevel,
  onHome,
  onNextLevel,
}: LevelCompleteProps) {
  return (
    <div className={styles.screen}>
      <Confetti active pieceCount={28} />

      <p className={styles.emoji} aria-hidden="true">
        🎉
      </p>

      <Stars earned={starsEarned} total={maxStars} />

      <Mascot mood="excited" className={styles.mascot} />

      <h1 className={styles.heading}>Level {levelNumber} Complete!</h1>

      <p className={styles.summary}>
        You practiced:
        <br />
        <strong>{skill}</strong>
      </p>

      <div className={styles.progressWrap}>
        <ProgressBar current={wordCount} total={wordCount} showDots={false} />
      </div>

      <div className={styles.actions}>
        <GameButton variant="secondary" onClick={onHome}>
          Home
        </GameButton>
        <GameButton variant="primary" onClick={onNextLevel} disabled={!hasNextLevel}>
          {hasNextLevel ? 'Next Level →' : 'More levels coming soon'}
        </GameButton>
      </div>
    </div>
  );
}
