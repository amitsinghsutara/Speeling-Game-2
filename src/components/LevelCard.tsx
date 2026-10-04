import type { LevelInfo } from '../data/types';
import type { LevelStatus } from '../game/engine';
import { GameButton } from './GameButton';
import { StarBadge } from './StarBadge';
import styles from './LevelCard.module.css';

export type { LevelStatus };

interface LevelCardProps {
  level: LevelInfo;
  status: LevelStatus;
  starsEarned: number;
  maxStars: number;
  onStart: (level: number) => void;
}

export function LevelCard({ level, status, starsEarned, maxStars, onStart }: LevelCardProps) {
  const locked = status === 'locked';

  return (
    <div className={`${styles.card} ${locked ? styles.locked : ''}`}>
      <div className={styles.badgeWrap}>
        {!locked && <StarBadge earned={starsEarned} max={maxStars} />}
        <div className={styles.badge}>{level.level}</div>
      </div>

      <div className={styles.body}>
        <p className={styles.title}>
          Level {level.level}
          {status === 'completed' && (
            <span className={styles.completedTag} aria-label="Completed">
              ✓
            </span>
          )}
        </p>
        <p className={styles.skill}>{level.skill}</p>
        <p className={styles.wordCount}>{level.wordCount} words</p>
      </div>

      <GameButton
        variant={locked ? 'ghost' : status === 'completed' ? 'secondary' : 'primary'}
        onClick={() => onStart(level.level)}
        disabled={locked}
        aria-label={locked ? `Level ${level.level} locked` : `Start level ${level.level}`}
      >
        {locked ? (
          <>
            <LockIcon /> Locked
          </>
        ) : status === 'completed' ? (
          'Play again'
        ) : (
          'Start'
        )}
      </GameButton>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
