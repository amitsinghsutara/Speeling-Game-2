import { Mascot } from './Mascot';
import { Stars } from './decorations/Stars';
import { Confetti } from './decorations/Confetti';
import { GameButton } from './GameButton';
import styles from './PuzzleComplete.module.css';

interface PuzzleCompleteProps {
  puzzleNumber: number;
  totalPuzzles: number;
  starsEarned: number;
  maxStars: number;
  onPuzzleMap: () => void;
  onNextPuzzle: () => void;
}

/** Lighter, quicker celebration shown between puzzles (level-complete is the bigger payoff). */
export function PuzzleComplete({
  puzzleNumber,
  totalPuzzles,
  starsEarned,
  maxStars,
  onPuzzleMap,
  onNextPuzzle,
}: PuzzleCompleteProps) {
  return (
    <div className={styles.screen}>
      <Confetti active pieceCount={14} />

      <Stars earned={starsEarned} total={maxStars} />

      <Mascot mood="excited" className={styles.mascot} />

      <h1 className={styles.heading}>Puzzle {puzzleNumber} Complete!</h1>
      <p className={styles.subtitle}>
        {puzzleNumber} of {totalPuzzles} puzzles done
      </p>

      <div className={styles.actions}>
        <GameButton variant="secondary" onClick={onPuzzleMap}>
          Puzzle Map
        </GameButton>
        <GameButton variant="primary" onClick={onNextPuzzle}>
          Next Puzzle →
        </GameButton>
      </div>
    </div>
  );
}
