import { PhonemeManifest } from '../types/phoneme-manifest';

/**
 * PhonemeEngine interface - contract for audio playback of phoneme clips.
 * Implementation uses Web Audio API with preloaded AudioBuffers.
 */
export interface PhonemeEngine {
  /** Load manifest and fetch/decode all clip WAV files. */
  load(manifest: PhonemeManifest): Promise<void>;
  /** Play a clip by ID. Optional playbackRate overrides global rate. */
  play(clipId: string, playbackRate?: number): void;
  /** Set global playback rate (clamped 0.1–4.0). Affects future plays. */
  setPlaybackRate(value: number): void;
  /** Get current global playback rate. */
  getPlaybackRate(): number;
  /** Stop all currently playing sources immediately. */
  stop(): void;
  /** Clean up: stop, clear buffers, close AudioContext. */
  destroy(): void;
  /** True after load() completes successfully. */
  isReady(): boolean;
}

/**
 * Web Audio implementation of PhonemeEngine.
 * No AudioContext is created until first load() or play().
 */
export class WebAudioPhonemeEngine implements PhonemeEngine {
  private context: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private globalRate = 1;
  private readonly activeSources = new Set<AudioBufferSourceNode>();
  private ready = false;

  /** Get or create AudioContext (lazy). */
  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  /** Load manifest: fetch and decode all clips to AudioBuffers. */
  async load(manifest: PhonemeManifest): Promise<void> {
    const ctx = this.ensureContext();
    // Resume context if suspended (needs user gesture)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Fetch and decode all clips in parallel
    await Promise.all(
      manifest.clips.map(async (clip) => {
        const resp = await fetch(`/phonemes/${clip}.wav`);
        if (!resp.ok) {
          throw new Error(`Failed to fetch /phonemes/${clip}.wav: ${resp.status}`);
        }
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        this.buffers.set(clip, audioBuffer);
      })
    );

    this.ready = true;
  }

  /** Play a clip. Creates a new source node each call. */
  play(clipId: string, playbackRate?: number): void {
    if (!this.ready) {
      throw new Error('PhonemeEngine not ready. Call load() first.');
    }
    const ctx = this.context;
    if (!ctx) {
      throw new Error('AudioContext not initialized');
    }
    const buffer = this.buffers.get(clipId);
    if (!buffer) {
      throw new Error(`Unknown clip: ${clipId}`);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate ?? this.globalRate;
    source.connect(ctx.destination);

    // Track source for stop()/destroy()
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };

    source.start();
  }

  /** Set global playback rate, clamped to [0.1, 4.0]. */
  setPlaybackRate(value: number): void {
    this.globalRate = Math.min(4, Math.max(0.1, value));
  }

  getPlaybackRate(): number {
    return this.globalRate;
  }

  /** Stop all active sources immediately. */
  stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Ignore errors from already-stopped sources
      }
      source.disconnect();
    }
    this.activeSources.clear();
  }

  /** Full cleanup. */
  destroy(): void {
    this.stop();
    this.buffers.clear();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }
}