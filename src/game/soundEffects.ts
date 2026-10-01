/**
 * Reusable sound-effect abstraction. Components should only ever call
 * `soundEffectPlayer.playClick()` — never touch the Web Audio API directly.
 * That keeps the door open to swapping in bundled audio clips later without
 * touching any component code, the same pattern `audio.ts` uses for the
 * spoken target word.
 */
export interface SoundEffectPlayer {
  /** Short, soft tap sound for any button press. */
  playClick(): void;
  isSupported(): boolean;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

class WebAudioSoundEffectPlayer implements SoundEffectPlayer {
  private context: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;
    this.context = new Ctor();
    return this.context;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!getAudioContextConstructor();
  }

  playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // Browsers suspend a freshly-created AudioContext until a user gesture;
    // a button click IS that gesture, so resume synchronously here.
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, now);

    // Quick, soft envelope: fade in over a few ms, fade out by ~90ms.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }
}

/** No-op fallback used automatically when the Web Audio API is unavailable. */
class SilentSoundEffectPlayer implements SoundEffectPlayer {
  isSupported(): boolean {
    return false;
  }
  playClick(): void {
    // Intentionally silent: nothing this environment can do.
  }
}

function createDefaultPlayer(): SoundEffectPlayer {
  if (typeof window !== 'undefined' && getAudioContextConstructor()) {
    return new WebAudioSoundEffectPlayer();
  }
  return new SilentSoundEffectPlayer();
}

export const soundEffectPlayer: SoundEffectPlayer = createDefaultPlayer();
