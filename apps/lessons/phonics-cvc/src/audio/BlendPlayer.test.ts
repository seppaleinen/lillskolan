import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playBlended } from '../audio/BlendPlayer';
import type { PhonemeEngine } from '../audio/PhonemeEngine';
import type { PhonemeChunk } from '../types/phoneme-manifest';

function makeMockEngine(ready = true, autoResolve = true): PhonemeEngine & {
  playCalls: string[];
  rateCalls: number[];
  currentRate: number;
  resolveNext: () => void;
  getPendingCount: () => number;
} {
  const playCalls: string[] = [];
  const rateCalls: number[] = [];
  let currentRate = 1;
  const pendingResolves: Array<() => void> = [];

  return {
    playCalls,
    rateCalls,
    get currentRate() { return currentRate; },
    isReady: () => ready,
    play: (clipId: string) => {
      playCalls.push(clipId);
      if (autoResolve) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        pendingResolves.push(resolve);
      });
    },
    resolveNext: () => {
      const resolve = pendingResolves.shift();
      if (resolve) resolve();
    },
    getPendingCount: () => pendingResolves.length,
    setPlaybackRate: (v: number) => { rateCalls.push(v); currentRate = v; },
    getPlaybackRate: () => currentRate,
    stop: () => {},
    destroy: () => {},
    load: async () => {},
  } as unknown as PhonemeEngine & { playCalls: string[]; rateCalls: number[]; currentRate: number; resolveNext: () => void; getPendingCount: () => number };
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

  it('awaits play() Promise resolution before playing next chunk', async () => {
    const engine = makeMockEngine(true, false);
    const testChunks = [
      { text: 'a', clip: 'a' },
      { text: 'b', clip: 'b' },
      { text: 'c', clip: 'c' },
    ];

    // Start playback without awaiting
    const playbackPromise = playBlended(engine, testChunks, 0.85);
    
    // First chunk should have been called, but second shouldn't yet
    expect(engine.playCalls).toEqual(['a']);
    expect(engine.getPendingCount()).toBe(1);
    
    // Resolve first clip
    engine.resolveNext();
    // Wait for the microtask queue to process
    await Promise.resolve();
    await Promise.resolve();
    
    // Now second clip should be called
    expect(engine.playCalls).toEqual(['a', 'b']);
    expect(engine.getPendingCount()).toBe(1);
    
    // Resolve second clip
    engine.resolveNext();
    await Promise.resolve();
    await Promise.resolve();
    
    // Now third clip should be called
    expect(engine.playCalls).toEqual(['a', 'b', 'c']);
    expect(engine.getPendingCount()).toBe(1);
    
    // Resolve third clip
    engine.resolveNext();
    await playbackPromise;
    
    // All done
    expect(engine.playCalls).toEqual(['a', 'b', 'c']);
  });
});