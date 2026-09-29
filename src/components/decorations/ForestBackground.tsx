import styles from './ForestBackground.module.css';

/**
 * Purely decorative forest scene rendered behind every screen: sky, sun,
 * drifting clouds, rolling hills, trees, bushes and rocks. Aria-hidden —
 * it carries no information the game logic depends on.
 */
export function ForestBackground() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.sun} />

      <div className={`${styles.cloud} ${styles.cloud1}`} />
      <div className={`${styles.cloud} ${styles.cloud2}`} />
      <div className={`${styles.cloud} ${styles.cloud3}`} />

      <svg className={styles.hillsBack} viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0 160 Q 240 90 480 150 T 960 140 T 1440 160 V320 H0 Z" />
      </svg>

      <svg className={`${styles.tree} ${styles.treeLeft}`} viewBox="0 0 80 140">
        <rect x="34" y="90" width="12" height="50" rx="4" className={styles.trunk} />
        <circle cx="40" cy="55" r="34" className={styles.leafDark} />
        <circle cx="20" cy="70" r="24" className={styles.leaf} />
        <circle cx="60" cy="70" r="24" className={styles.leaf} />
      </svg>

      <svg className={`${styles.tree} ${styles.treeRight}`} viewBox="0 0 80 140">
        <rect x="34" y="90" width="12" height="50" rx="4" className={styles.trunk} />
        <circle cx="40" cy="55" r="34" className={styles.leafDark} />
        <circle cx="20" cy="70" r="24" className={styles.leaf} />
        <circle cx="60" cy="70" r="24" className={styles.leaf} />
      </svg>

      <svg className={`${styles.rock} ${styles.rockLeft}`} viewBox="0 0 60 30">
        <ellipse cx="30" cy="20" rx="28" ry="14" />
      </svg>
      <svg className={`${styles.rock} ${styles.rockRight}`} viewBox="0 0 60 30">
        <ellipse cx="30" cy="20" rx="28" ry="14" />
      </svg>

      <svg className={`${styles.bush} ${styles.bush1}`} viewBox="0 0 90 40">
        <circle cx="20" cy="25" r="18" />
        <circle cx="45" cy="18" r="22" />
        <circle cx="70" cy="25" r="18" />
      </svg>
      <svg className={`${styles.bush} ${styles.bush2}`} viewBox="0 0 90 40">
        <circle cx="20" cy="25" r="18" />
        <circle cx="45" cy="18" r="22" />
        <circle cx="70" cy="25" r="18" />
      </svg>

      <div className={styles.grassStrip} />
    </div>
  );
}
