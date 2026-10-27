/**
 * BlendPlayer — plays chunk clips sequentially at a slow playback rate.
 *
 * Design: takes an injectable `delayForClip` helper (default: no-op) so the
 * sequencing is testable without real timers or WebAudio. The engine's global
 * rate is saved/restored around playback so the lesson's blend rate does not
 * leak into subsequent individual-clip plays.
 */

import type { PhonemeChunk } from '../types/phoneme-manifest';
import type { PhonemeEngine } from './PhonemeEngine';

export async function playBlended(
  engine: PhonemeEngine,
  chunks: PhonemeChunk[],
  rate = 0.85,
  delayForClip: (chunk: PhonemeChunk, rate: number) => Promise<void> = () => Promise.resolve()
): Promise<void> {
  if (!engine.isReady()) {
    throw new Error('engine not ready');
  }

  const prev = engine.getPlaybackRate();
  engine.setPlaybackRate(rate);

  try {
    for (const chunk of chunks) {
      engine.play(chunk.clip);
      await delayForClip(chunk, rate);
    }
  } finally {
    engine.setPlaybackRate(prev);
  }
}