import styles from './Stars.module.css';

interface StarsProps {
  count?: number;
}

function StarShape({ delay }: { delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.star} style={{ animationDelay: `${delay}s` }}>
      <path d="M12 1l3.2 7.2L23 9l-6 5.6L18.5 23 12 18.6 5.5 23 7 14.6 1 9l7.8-.8z" />
    </svg>
  );
}

/** Row of twinkling celebration stars, used on the level-complete screen. */
export function Stars({ count = 3 }: StarsProps) {
  return (
    <div className={styles.row} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <StarShape key={i} delay={i * 0.15} />
      ))}
    </div>
  );
}
