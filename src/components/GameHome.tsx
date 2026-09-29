import { getLevelList } from '../data/loadContent';
import { isLevelUnlocked } from '../game/persistence';
import { Mascot } from './Mascot';
import { LevelCard, type LevelStatus } from './LevelCard';
import styles from './GameHome.module.css';

interface GameHomeProps {
  completedLevels: number[];
  onStartLevel: (level: number) => void;
}

function statusFor(level: number, completedLevels: number[]): LevelStatus {
  if (completedLevels.includes(level)) return 'completed';
  if (!isLevelUnlocked(level, completedLevels)) return 'locked';
  return 'available';
}

export function GameHome({ completedLevels, onStartLevel }: GameHomeProps) {
  const levels = getLevelList();

  return (
    <div className={styles.screen}>
      <div className={styles.titleBoard}>
        <h1 className={styles.title}>Forest Spelling Adventure</h1>
      </div>

      <Mascot mood="happy" className={styles.mascot} />

      <p className={styles.subtitle}>Pick a level to start practicing!</p>

      <div className={styles.levelList}>
        {levels.map((level) => (
          <LevelCard
            key={level.level}
            level={level}
            status={statusFor(level.level, completedLevels)}
            onStart={onStartLevel}
          />
        ))}
      </div>
    </div>
  );
}
