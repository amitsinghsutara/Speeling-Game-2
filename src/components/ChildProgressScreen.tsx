import { Mascot } from './Mascot';
import { ProgressBar } from './ProgressBar';
import { soundEffectPlayer } from '../game/soundEffects';
import { useChildProgress, type CachedProgress, type ProgressResponse } from '../progress';
import styles from './ChildProgressScreen.module.css';

interface ChildProgressScreenProps {
  onBack: () => void;
}

const TREND_DISPLAY: Record<string, { icon: string; label: string }> = {
  improving: { icon: '↑', label: 'Improving' },
  stable: { icon: '→', label: 'Stable' },
  'needs-practice': { icon: '●', label: 'Practice recommended' },
};

function trendDisplay(trend: string): { icon: string; label: string } {
  return TREND_DISPLAY[trend] ?? { icon: '→', label: trend };
}

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function ProgressSummary({ data }: { data: ProgressResponse }) {
  const overallTrend = trendDisplay(data.overall.trend);

  return (
    <>
      <section className={styles.panel}>
        <p className={styles.overallEmoji} aria-hidden="true">
          🌟
        </p>
        <p className={styles.overallSummary}>{data.overall.summary}</p>
        <p className={styles.trendLine}>
          <span aria-hidden="true">{overallTrend.icon}</span> {overallTrend.label}
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>📚 Skills</h2>
        <div className={styles.skillList}>
          {data.skills.map((skill) => {
            const percent = Math.round(skill.mastery * 100);
            const skillTrend = trendDisplay(skill.trend);
            return (
              <div key={skill.id} className={styles.skillRow}>
                <div className={styles.skillHeader}>
                  <span className={styles.skillName}>{skill.name}</span>
                  <span className={styles.skillPercent}>{percent}%</span>
                </div>
                <ProgressBar current={percent} total={100} showDots={false} />
                <span className={styles.trendLine}>
                  <span aria-hidden="true">{skillTrend.icon}</span> {skillTrend.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {data.strengths.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>💪 Strengths</h2>
          <ul className={styles.list}>
            {data.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>
      )}

      {data.practiceAreas.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>🎯 Practice Opportunities</h2>
          {data.practiceAreas.map((area) => (
            <div key={area.skillId} className={styles.practiceArea}>
              <h3 className={styles.practiceTitle}>{area.title}</h3>
              <p className={styles.practiceDescription}>{area.description}</p>
              <p className={styles.practiceSuggestion}>{area.suggestion}</p>
            </div>
          ))}
        </section>
      )}

      <section className={styles.panel}>
        <p className={styles.encouragement}>{data.encouragement}</p>
      </section>
    </>
  );
}

function CacheBanner({ offline, cached }: { offline: boolean; cached: CachedProgress }) {
  return (
    <p className={styles.cacheBanner}>
      {offline ? "You're offline — showing progress from " : "Couldn't refresh — showing progress from "}
      {formatDate(cached.retrievedAt)}.
    </p>
  );
}

export function ChildProgressScreen({ onBack }: ChildProgressScreenProps) {
  const { state, refresh } = useChildProgress();

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
          aria-label="Back to home"
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
          <span className={styles.titleLabel}>👨‍👩‍👧 Child's Progress</span>
        </div>
      </div>

      <div className={styles.content}>
        {state.status === 'loading' && (
          <div className={styles.statusPanel} role="status" aria-live="polite">
            <Mascot mood="thinking" className={styles.statusMascot} />
            <p className={styles.statusHeading}>Analyzing progress...</p>
            <p className={styles.statusBody}>🌱 Looking at recent learning activities...</p>
          </div>
        )}

        {state.status === 'empty' && (
          <div className={styles.statusPanel}>
            <Mascot mood="encouraging" className={styles.statusMascot} />
            <p className={styles.statusHeading}>🌱 Your child's progress is just getting started.</p>
            <p className={styles.statusBody}>
              Complete a few more spelling activities and we'll have more information to share here.
            </p>
          </div>
        )}

        {state.status === 'offline' &&
          (state.cached ? (
            <>
              <CacheBanner offline cached={state.cached} />
              <ProgressSummary data={state.cached.data} />
            </>
          ) : (
            <div className={styles.statusPanel}>
              <Mascot mood="thinking" className={styles.statusMascot} />
              <p className={styles.statusHeading}>You're currently offline.</p>
              <p className={styles.statusBody}>
                Child's Progress needs an internet connection to retrieve the latest learning summary.
              </p>
              <p className={styles.statusFootnote}>
                Your child's game progress is safe and will continue working offline.
              </p>
            </div>
          ))}

        {state.status === 'error' &&
          (state.cached ? (
            <>
              <CacheBanner offline={false} cached={state.cached} />
              <ProgressSummary data={state.cached.data} />
            </>
          ) : (
            <div className={styles.statusPanel}>
              <Mascot mood="encouraging" className={styles.statusMascot} />
              <p className={styles.statusHeading}>We couldn't load the latest progress right now.</p>
              <p className={styles.statusBody}>Please try again later.</p>
            </div>
          ))}

        {state.status === 'ready' && <ProgressSummary data={state.data} />}

        {state.status !== 'loading' && (
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              soundEffectPlayer.playClick();
              void refresh();
            }}
          >
            ↻ {state.status === 'error' ? 'Try Again' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}
