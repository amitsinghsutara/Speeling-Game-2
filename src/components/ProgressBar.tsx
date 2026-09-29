import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  current: number;
  total: number;
  showDots?: boolean;
}

/** Linear progress bar with an optional row of per-question dots. */
export function ProgressBar({ current, total, showDots = true }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const fraction = Math.min(Math.max(current / safeTotal, 0), 1);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progress: ${current} of ${total} words`}
      >
        <div className={styles.fill} style={{ width: `${fraction * 100}%` }} />
      </div>
      {showDots && total <= 40 && (
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`${styles.dot} ${i < current ? styles.dotDone : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
