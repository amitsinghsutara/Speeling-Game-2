import styles from './AudioButton.module.css';

interface AudioButtonProps {
  onPlay: () => void;
  size?: 'sm' | 'lg';
  label?: string;
}

/** Speaker button used to hear/replay the target word. Always available. */
export function AudioButton({ onPlay, size = 'lg', label = 'Play word again' }: AudioButtonProps) {
  return (
    <button type="button" onClick={onPlay} className={`${styles.button} ${styles[size]}`} aria-label={label}>
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M3 10v4a1 1 0 0 0 1 1h3.6l4.2 3.6a1 1 0 0 0 1.7-.7V6.1a1 1 0 0 0-1.7-.7L7.6 9H4a1 1 0 0 0-1 1Z" />
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M19 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </button>
  );
}
