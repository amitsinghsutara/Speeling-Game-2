import styles from './Mascot.module.css';

export type MascotMood = 'happy' | 'excited' | 'thinking' | 'encouraging';

interface MascotProps {
  mood: MascotMood;
  className?: string;
  /** Accessible label; defaults to a mood-appropriate description. */
  label?: string;
}

const MOOD_LABELS: Record<MascotMood, string> = {
  happy: 'Fern the fox smiling happily',
  excited: 'Fern the fox celebrating excitedly',
  thinking: 'Fern the fox thinking',
  encouraging: 'Fern the fox giving an encouraging look',
};

interface FaceConfig {
  leftBrow: string;
  rightBrow: string;
  mouth: string;
  pupilOffsetY: number;
  eyeScale: number;
  showSparkles: boolean;
  showSweat: boolean;
  headTilt: number;
}

const FACES: Record<MascotMood, FaceConfig> = {
  happy: {
    leftBrow: 'M62 80 Q76 72 90 80',
    rightBrow: 'M110 80 Q124 72 138 80',
    mouth: 'M78 136 Q100 160 122 136',
    pupilOffsetY: 0,
    eyeScale: 1,
    showSparkles: false,
    showSweat: false,
    headTilt: 0,
  },
  excited: {
    leftBrow: 'M60 76 Q76 64 92 78',
    rightBrow: 'M108 78 Q124 64 140 76',
    mouth: 'M72 132 Q100 172 128 132 Q100 148 72 132 Z',
    pupilOffsetY: -1,
    eyeScale: 1.15,
    showSparkles: true,
    showSweat: false,
    headTilt: -4,
  },
  thinking: {
    leftBrow: 'M62 84 Q76 78 90 82',
    rightBrow: 'M110 76 Q124 68 138 78',
    mouth: 'M84 142 Q100 138 116 140',
    pupilOffsetY: -3,
    eyeScale: 0.95,
    showSparkles: false,
    showSweat: false,
    headTilt: 6,
  },
  encouraging: {
    leftBrow: 'M62 86 Q76 80 90 86',
    rightBrow: 'M110 86 Q124 80 138 86',
    mouth: 'M82 142 Q100 136 118 142',
    pupilOffsetY: 2,
    eyeScale: 0.9,
    showSparkles: false,
    showSweat: true,
    headTilt: 3,
  },
};

/**
 * Friendly cartoon fox mascot, "Fern". Pure inline SVG so it can be
 * restyled or swapped for illustrated art later without touching any
 * game logic — every screen that reacts to game state just passes a
 * new `mood`.
 */
export function Mascot({ mood, className, label }: MascotProps) {
  const face = FACES[mood];

  return (
    <div
      className={`${styles.wrapper} ${styles[mood]} ${className ?? ''}`}
      role="img"
      aria-label={label ?? MOOD_LABELS[mood]}
    >
      <svg
        viewBox="0 0 200 200"
        className={styles.svg}
        style={{ transform: `rotate(${face.headTilt}deg)` }}
        aria-hidden="true"
      >
        {/* ears */}
        <path d="M50 60 L30 10 L85 55 Z" className={styles.earOuter} />
        <path d="M150 60 L170 10 L115 55 Z" className={styles.earOuter} />
        <path d="M55 52 L42 24 L78 50 Z" className={styles.earInner} />
        <path d="M145 52 L158 24 L122 50 Z" className={styles.earInner} />

        {/* head */}
        <ellipse cx="100" cy="105" rx="72" ry="66" className={styles.head} />

        {/* muzzle */}
        <ellipse cx="100" cy="128" rx="40" ry="30" className={styles.muzzle} />

        {/* cheeks blush */}
        <ellipse cx="52" cy="118" rx="12" ry="8" className={styles.blush} />
        <ellipse cx="148" cy="118" rx="12" ry="8" className={styles.blush} />

        {/* eyebrows */}
        <path d={face.leftBrow} className={styles.eyebrow} />
        <path d={face.rightBrow} className={styles.eyebrow} />

        {/* eyes */}
        <g style={{ transform: `scale(${face.eyeScale})`, transformOrigin: '100px 98px' }}>
          <circle cx="76" cy="98" r="10" className={styles.eyeWhite} />
          <circle cx="124" cy="98" r="10" className={styles.eyeWhite} />
          <circle cx="76" cy={98 + face.pupilOffsetY} r="5" className={styles.pupil} />
          <circle cx="124" cy={98 + face.pupilOffsetY} r="5" className={styles.pupil} />
        </g>

        {/* nose */}
        <ellipse cx="100" cy="122" rx="7" ry="5" className={styles.nose} />

        {/* mouth */}
        <path d={face.mouth} className={styles.mouth} />

        {face.showSweat && <path d="M148 78 q6 8 0 16 q-6 -4 0 -16 Z" className={styles.sweat} />}

        {face.showSparkles && (
          <g className={styles.sparkles}>
            <path d="M30 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" />
            <path d="M175 70 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />
          </g>
        )}
      </svg>
    </div>
  );
}
