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

/**
 * Plays a pre-generated MP3 (see scripts/generate-word-audio.cjs) for the
 * word, bundled under /audio/words/. This is what the game actually uses in
 * production: unlike speechSynthesis, plain <audio> playback works reliably
 * inside the Android container's WebView, and the files get precached by
 * the service worker for offline play. Falls back to `fallback` (speech
 * synthesis, or silence) for any word that has no generated file yet.
 */
class FileAudioPlayer implements WordAudioPlayer {
  private current: HTMLAudioElement | null = null;
  private fallback: WordAudioPlayer;

  constructor(fallback: WordAudioPlayer) {
    this.fallback = fallback;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
  }

  playWord(word: string): void {
    if (!word) return;
    this.stop();

    if (!this.isSupported()) {
      this.fallback.playWord(word);
      return;
    }

    const audio = new Audio(`/audio/words/${encodeURIComponent(word)}.mp3`);
    this.current = audio;
    const useFallback = () => {
      if (this.current === audio) this.fallback.playWord(word);
    };
    audio.addEventListener('error', useFallback);
    audio.play().catch(useFallback);
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
    this.fallback.stop();
  }
}

function createDefaultPlayer(): WordAudioPlayer {
  const fallback: WordAudioPlayer =
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? new SpeechSynthesisAudioPlayer({ rate: 0.8, lang: 'en-US' })
      : new SilentAudioPlayer();

  if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    return new FileAudioPlayer(fallback);
  }
  return fallback;
}

export const wordAudioPlayer: WordAudioPlayer = createDefaultPlayer();
