import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playBlended } from '../audio/BlendPlayer';
import type { PhonemeEngine } from '../audio/PhonemeEngine';
import type { PhonemeChunk } from '../types/phoneme-manifest';

function makeMockEngine(ready = true): PhonemeEngine & {
  playCalls: string[];
  rateCalls: number[];
  currentRate: number;
} {
  const playCalls: string[] = [];
  const rateCalls: number[] = [];
  let currentRate = 1;

  return {
    playCalls,
    rateCalls,
    get currentRate() { return currentRate; },
    isReady: () => ready,
    play: (clipId: string) => { playCalls.push(clipId); },
    setPlaybackRate: (v: number) => { rateCalls.push(v); currentRate = v; },
    getPlaybackRate: () => currentRate,
    stop: () => {},
    destroy: () => {},
    load: async () => {},
  } as unknown as PhonemeEngine & { playCalls: string[]; rateCalls: number[]; currentRate: number };
}

const chunks: PhonemeChunk[] = [
  { text: 'b', clip: 'b' },
  { text: 'il', clip: 'il' },
  { text: 'b', clip: 'b' },
  { text: 'i', clip: 'i' },
  { text: 'l', clip: 'l' },
];

describe('playBlended', () => {
  it('plays each chunk clip in order', async () => {
    const engine = makeMockEngine();
    await playBlended(engine, chunks, 0.85);
    expect(engine.playCalls).toEqual(['b', 'il', 'b', 'i', 'l']);
  });

  it('sets rate to 0.85 before playing and restores in finally', async () => {
    const engine = makeMockEngine();
    engine.setPlaybackRate(1.5);
    await playBlended(engine, chunks, 0.85);
    // Rate should be restored to 1.5 after playback.
    expect(engine.currentRate).toBe(1.5);
    // setPlaybackRate should have been called with 0.85 then restored to 1.5.
    expect(engine.rateCalls).toContain(0.85);
    expect(engine.rateCalls).toContain(1.5);
  });

  it('restores rate even if playback throws', async () => {
    const engine = makeMockEngine();
    engine.setPlaybackRate(2.0);
    const failingEngine: PhonemeEngine = {
      ...engine,
      play: () => { throw new Error('play failed'); },
    } as unknown as PhonemeEngine;

    await expect(playBlended(failingEngine, chunks, 0.85)).rejects.toThrow('play failed');
    // Rate should still be restored.
    expect(failingEngine.getPlaybackRate()).toBe(2.0);
  });

  it('rejects when engine not ready', async () => {
    const engine = makeMockEngine(false);
    await expect(playBlended(engine, chunks, 0.85)).rejects.toThrow('engine not ready');
  });

  it('uses default rate 0.85 when not specified', async () => {
    const engine = makeMockEngine();
    await playBlended(engine, chunks);
    expect(engine.rateCalls).toContain(0.85);
  });

  it('calls delayForClip for each chunk', async () => {
    const engine = makeMockEngine();
    const delayCalls: PhonemeChunk[] = [];
    await playBlended(engine, chunks, 0.85, (chunk) => {
      delayCalls.push(chunk);
      return Promise.resolve();
    });
    expect(delayCalls).toEqual(chunks);
  });
});