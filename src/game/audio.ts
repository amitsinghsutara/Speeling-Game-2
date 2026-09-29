/**
 * Reusable audio abstraction. Game code should only ever call
 * `wordAudioPlayer.playWord(word)` / `.stop()` — never touch
 * `window.speechSynthesis` directly. That keeps the door open to swapping
 * in bundled, pre-recorded audio later without touching game logic.
 */
export interface WordAudioPlayer {
  /** Speaks/plays the given word. Safe to call even if audio is unsupported. */
  playWord(word: string): void;
  /** Stops any audio currently playing. */
  stop(): void;
  /** Whether this environment can actually produce audio. */
  isSupported(): boolean;
}

class SpeechSynthesisAudioPlayer implements WordAudioPlayer {
  private rate: number;
  private lang: string;

  constructor(options: { rate?: number; lang?: string } = {}) {
    this.rate = options.rate ?? 0.8;
    this.lang = options.lang ?? 'en-US';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  playWord(word: string): void {
    if (!this.isSupported() || !word) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = this.lang;
    utterance.rate = this.rate;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
  }
}

/** No-op fallback used automatically when speech synthesis is unavailable. */
class SilentAudioPlayer implements WordAudioPlayer {
  isSupported(): boolean {
    return false;
  }
  playWord(): void {
    // Intentionally silent: nothing this environment can do.
  }
  stop(): void {
    // Intentionally silent.
  }
}

function createDefaultPlayer(): WordAudioPlayer {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return new SpeechSynthesisAudioPlayer({ rate: 0.8, lang: 'en-US' });
  }
  return new SilentAudioPlayer();
}

export const wordAudioPlayer: WordAudioPlayer = createDefaultPlayer();
