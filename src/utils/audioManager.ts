/**
 * audioManager.ts
 *
 * Singleton AudioManager with per-sound audio pooling.
 * Ensures scan sounds play instantly with no overlap and minimal latency.
 * All methods are safe to call server-side (SSR guard on window access).
 */

type SoundType = "success" | "error" | "quick-success";
type SoundFormat = "wav" | "mp3" | "ogg";

interface AudioPool {
  audio: HTMLAudioElement;
  inUse: boolean;
}

interface SoundConfig {
  file: string;
  volume: number;
}

class AudioManager {
  private static instance: AudioManager;
  private pools: Map<SoundType, AudioPool[]> = new Map();
  private readonly POOL_SIZE = 3;
  private readonly SOUND_BASE_PATH = "/sounds";
  /** Timestamp of last play per sound type for debouncing */
  private lastPlayed: Map<SoundType, number> = new Map();
  private readonly DEBOUNCE_MS = 50;
  private initialised = false;

  private readonly soundConfigs: Record<SoundType, SoundConfig> = {
    success: { file: "scan-success", volume: 0.7 },
    "quick-success": { file: "scan-success-quick", volume: 0.5 },
    error: { file: "scan-error", volume: 0.85 },
  };

  // ─── Singleton ────────────────────────────────────────────────────────────
  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // ─── Lazy init (only in browser) ──────────────────────────────────────────
  private ensureInitialised(): void {
    if (this.initialised || typeof window === "undefined") return;
    this.initialised = true;
    this.initializePools();
  }

  // ─── Pool setup ───────────────────────────────────────────────────────────
  private initializePools(): void {
    (Object.keys(this.soundConfigs) as SoundType[]).forEach((type) => {
      const pool: AudioPool[] = [];
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = this.getSoundPath(type);
        audio.volume = this.soundConfigs[type].volume;
        pool.push({ audio, inUse: false });
      }
      this.pools.set(type, pool);
    });

    // Fire-and-forget preload
    this.preloadSounds();
  }

  private getSoundPath(type: SoundType, format: SoundFormat = "wav"): string {
    return `${this.SOUND_BASE_PATH}/${this.soundConfigs[type].file}.${format}`;
  }

  private async preloadSounds(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.pools.forEach((pool) => {
      pool.forEach(({ audio }) => {
        promises.push(
          new Promise<void>((resolve) => {
            const onReady = () => resolve();
            audio.addEventListener("canplaythrough", onReady, { once: true });
            audio.addEventListener("error", onReady, { once: true }); // still resolve so we don't block
            audio.load();
          })
        );
      });
    });

    await Promise.allSettled(promises);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  play(type: SoundType): void {
    this.ensureInitialised();
    if (typeof window === "undefined") return;

    // Debounce same-sound bursts
    const now = Date.now();
    const last = this.lastPlayed.get(type) ?? 0;
    if (now - last < this.DEBOUNCE_MS) return;
    this.lastPlayed.set(type, now);

    const pool = this.pools.get(type);
    if (!pool) return;

    // Prefer a free slot; fall back to the instance furthest along (least likely audible)
    const available = pool.find((p) => !p.inUse);
    const instance =
      available ??
      pool.reduce((a, b) =>
        b.audio.currentTime > a.audio.currentTime ? b : a
      );

    this.playAudio(instance, type);
  }

  private playAudio(instance: AudioPool, type: SoundType): void {
    const { audio } = instance;
    audio.currentTime = 0;
    audio.volume = this.soundConfigs[type].volume;
    instance.inUse = true;

    const release = () => {
      instance.inUse = false;
      audio.removeEventListener("ended", release);
    };
    audio.addEventListener("ended", release, { once: true });

    audio.play().catch(() => {
      // Autoplay blocked or file missing — silently release
      instance.inUse = false;
    });
  }

  // ─── Convenience methods ──────────────────────────────────────────────────
  playScanSuccess(): void { this.play("success"); }
  playScanSuccessQuick(): void { this.play("quick-success"); }
  playScanError(): void { this.play("error"); }

  setVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    this.pools.forEach((pool) =>
      pool.forEach(({ audio }) => (audio.volume = v))
    );
  }

  setMuted(muted: boolean): void {
    this.pools.forEach((pool) =>
      pool.forEach(({ audio }) => (audio.muted = muted))
    );
  }

  async checkSoundAvailability(): Promise<Record<SoundType, boolean>> {
    const result: Record<string, boolean> = {};
    for (const type of Object.keys(this.soundConfigs) as SoundType[]) {
      try {
        const res = await fetch(this.getSoundPath(type), { method: "HEAD" });
        result[type] = res.ok;
      } catch {
        result[type] = false;
      }
    }
    return result as Record<SoundType, boolean>;
  }

  destroy(): void {
    this.pools.forEach((pool) =>
      pool.forEach(({ audio }) => {
        audio.pause();
        audio.src = "";
        audio.load();
      })
    );
    this.pools.clear();
    this.lastPlayed.clear();
    this.initialised = false;
  }
}

// Export singleton
export const audioManager = AudioManager.getInstance();
export default audioManager;
