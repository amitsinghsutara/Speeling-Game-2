import type { Question } from '../data/types';
import { isPuzzleUnlocked } from '../game/engine';
import { soundEffectPlayer } from '../game/soundEffects';
import { Mascot } from './Mascot';
import styles from './PuzzleSelect.module.css';

interface PuzzleSelectProps {
  levelNumber: number;
  levelSkill: string;
  puzzles: Question[][];
  completedPuzzleNumbers: number[];
  onSelectPuzzle: (puzzleNumber: number) => void;
  onBack: () => void;
}

type PuzzleNodeStatus = 'locked' | 'available' | 'completed';

function statusFor(puzzleNumber: number, completed: number[]): PuzzleNodeStatus {
  if (completed.includes(puzzleNumber)) return 'completed';
  if (isPuzzleUnlocked(puzzleNumber, completed)) return 'available';
  return 'locked';
}

interface PuzzleNodeProps {
  puzzleNumber: number;
  wordCount: number;
  status: PuzzleNodeStatus;
  isLast: boolean;
  onSelect: () => void;
}

function PuzzleNode({ puzzleNumber, wordCount, status, isLast, onSelect }: PuzzleNodeProps) {
  const locked = status === 'locked';

  return (
    <div className={styles.nodeRow}>
      <div className={styles.nodeColumn}>
        <button
          type="button"
          className={`${styles.node} ${styles[status]}`}
          onClick={() => {
            soundEffectPlayer.playClick();
            onSelect();
          }}
          disabled={locked}
          aria-label={
            locked
              ? `Puzzle ${puzzleNumber}, locked`
              : status === 'completed'
                ? `Puzzle ${puzzleNumber}, completed, play again`
                : `Puzzle ${puzzleNumber}, start`
          }
        >
          {status === 'completed' ? (
            <span aria-hidden="true">✓</span>
          ) : locked ? (
            <LockIcon />
          ) : (
            <span aria-hidden="true">{puzzleNumber}</span>
          )}
        </button>
        {!isLast && <div className={`${styles.connector} ${status === 'completed' ? styles.connectorDone : ''}`} />}
      </div>

      <div className={styles.nodeLabel}>
        <p className={styles.nodeTitle}>Puzzle {puzzleNumber}</p>
        <p className={styles.nodeSubtitle}>{wordCount} words</p>
      </div>
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

export function PuzzleSelect({
  levelNumber,
  levelSkill,
  puzzles,
  completedPuzzleNumbers,
  onSelectPuzzle,
  onBack,
}: PuzzleSelectProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => {
            soundEffectPlayer.playClick();
            onBack();
          }}
          aria-label="Back to level select"
        >
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
        <div className={styles.titleBoard}>
          <span className={styles.levelLabel}>Level {levelNumber}</span>
          <span className={styles.skillLabel}>{levelSkill}</span>
        </div>
      </div>

      <Mascot mood="happy" className={styles.mascot} />

      <p className={styles.subtitle}>Choose a puzzle to practice!</p>

      <div className={styles.path}>
        {puzzles.map((puzzle, index) => {
          const puzzleNumber = index + 1;
          return (
            <PuzzleNode
              key={puzzleNumber}
              puzzleNumber={puzzleNumber}
              wordCount={puzzle.length}
              status={statusFor(puzzleNumber, completedPuzzleNumbers)}
              isLast={index === puzzles.length - 1}
              onSelect={() => onSelectPuzzle(puzzleNumber)}
            />
          );
        })}
      </div>
    </div>
  );
}
