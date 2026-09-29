import { useMemo } from 'react';
import styles from './Confetti.module.css';

interface ConfettiProps {
  active: boolean;
  pieceCount?: number;
}

const COLORS = ['#ffd35c', '#4fb3e8', '#e25c4f', '#8fd67f', '#c97af3'];

/** Lightweight celebratory confetti burst. Purely decorative. */
export function Confetti({ active, pieceCount = 18 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: (i / pieceCount) * 100 + (i % 3) * 2,
        color: COLORS[i % COLORS.length],
        delay: (i % 6) * 0.12,
        rotate: (i * 37) % 360,
      })),
    [pieceCount],
  );

  if (!active) return null;

  return (
    <div className={styles.field} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={styles.piece}
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
