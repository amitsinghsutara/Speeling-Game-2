import { getLevelList, getPuzzleCountForLevel } from '../data/loadContent';
import { computeLevelStatuses, MAX_STARS_PER_PUZZLE } from '../game/engine';
import type { PuzzleProgress, PuzzleStars } from '../game/persistence';
import { Mascot } from './Mascot';
import { LevelCard } from './LevelCard';
import styles from './GameHome.module.css';

interface GameHomeProps {
  puzzleProgress: PuzzleProgress;
  puzzleStars: PuzzleStars;
  onSelectLevel: (level: number) => void;
}

export function GameHome({ puzzleProgress, puzzleStars, onSelectLevel }: GameHomeProps) {
  const levels = getLevelList();
  const puzzleCountByLevel = Object.fromEntries(levels.map((l) => [l.level, getPuzzleCountForLevel(l.level)]));
  const statuses = computeLevelStatuses(
    levels.map((l) => l.level),
    puzzleProgress,
    puzzleCountByLevel,
  );

  return (
    <div className={styles.screen}>
      <div className={styles.titleBoard}>
        <h1 className={styles.title}>Forest Spelling Adventure</h1>
      </div>

      <Mascot mood="happy" className={styles.mascot} />

      <p className={styles.subtitle}>Pick a level to start practicing!</p>

      <div className={styles.levelListWrap}>
        <div className={styles.levelList}>
          {levels.map((level) => {
            const starsForLevel = puzzleStars[level.level] ?? {};
            const starsEarned = Object.values(starsForLevel).reduce((sum, n) => sum + n, 0);
            const maxStars = puzzleCountByLevel[level.level] * MAX_STARS_PER_PUZZLE;
            return (
              <LevelCard
                key={level.level}
                level={level}
                status={statuses.get(level.level) ?? 'locked'}
                starsEarned={starsEarned}
                maxStars={maxStars}
                onStart={onSelectLevel}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
