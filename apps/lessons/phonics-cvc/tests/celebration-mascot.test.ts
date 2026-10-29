import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCelebration } from '../src/components/Celebration';
import { createMascot } from '../src/components/Mascot';
import { poseFor } from '../src/utils/mascot';

/**
 * Tracks mascot instances so afterEach can destroy them and keep the
 * module-level instance count (and style teardown) consistent across files.
 */
const activeMascots: Array<ReturnType<typeof createMascot>> = [];

function track(mascot: ReturnType<typeof createMascot>): ReturnType<typeof createMascot> {
  activeMascots.push(mascot);
  return mascot;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const m of activeMascots) {
    try {
      m.destroy();
    } catch {
      // ignore
    }
  }
  activeMascots.length = 0;
  const styleEl = document.getElementById('mascot-styles');
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
});

describe('createCelebration with mascot integration', () => {
  it('trigger() with no options works exactly as before (backward compatible)', () => {
    const cel = createCelebration();
    cel.trigger();

    const stars = cel.element.querySelectorAll('.star');
    const confetti = cel.element.querySelectorAll('.confetti');

    expect(stars.length).toBeGreaterThanOrEqual(5);
    expect(stars.length).toBeLessThanOrEqual(7);
    expect(confetti.length).toBeGreaterThanOrEqual(10);
    expect(confetti.length).toBeLessThanOrEqual(14);
  });

  it('trigger() with mascot sets pose and speech', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, pose: 'cheer', phraseKey: 'stepComplete' });

    expect(mascot.element.getAttribute('data-pose')).toBe('cheer');
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    expect(bubble.hidden).toBe(false);
    expect(bubble.textContent).toBeTruthy();
    expect(bubble.textContent).not.toBe('');
  });

  it('trigger() with mascot uses default pose "cheer" when pose not specified', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, phraseKey: 'stepComplete' });

    expect(mascot.element.getAttribute('data-pose')).toBe('cheer');
  });

  it('trigger() with mascot uses a celebrate phrase when phraseKey not specified', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot });

    expect(mascot.element.getAttribute('data-pose')).toBe('cheer');
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    expect(bubble.textContent).not.toBe('');
    const celebratePhrases = ['Grattis! Du klarade lektionen!', 'Fantastiskt!', 'Mycket bra!'];
    expect(celebratePhrases).toContain(bubble.textContent);
  });

  it('trigger() with explicit pose "celebrate" uses that pose', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, pose: 'celebrate', phraseKey: 'celebrate' });

    expect(mascot.element.getAttribute('data-pose')).toBe('celebrate');
  });

  it('trigger() with explicit pose "thinking" uses that pose', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, pose: 'thinking', phraseKey: 'thinking' });

    expect(mascot.element.getAttribute('data-pose')).toBe('thinking');
  });

  it('trigger() with explicit pose "idle" uses that pose', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'cheer' }));

    cel.trigger({ mascot, pose: 'idle', phraseKey: 'encourage' });

    expect(mascot.element.getAttribute('data-pose')).toBe('idle');
  });

  it('poseFor maps phrase keys to poses as documented', () => {
    expect(poseFor('stepComplete')).toBe('cheer');
    expect(poseFor('celebrate')).toBe('celebrate');
    expect(poseFor('thinking')).toBe('thinking');
    expect(poseFor('encourage')).toBe('idle');
  });

  it('trigger() with mascot sets a stepComplete phrase in the bubble', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, phraseKey: 'stepComplete' });

    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    const stepCompletePhrases = ['Bra jobbat!', 'Du klarade det!', 'Finns inget stopp!'];
    expect(stepCompletePhrases).toContain(bubble.textContent);
  });

  it('trigger() without mascot does not affect any mascot', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger();

    expect(mascot.element.getAttribute('data-pose')).toBe('idle');
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    expect(bubble.hidden).toBe(true);
  });

  it('trigger() with mascot still spawns confetti', () => {
    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, pose: 'cheer', phraseKey: 'stepComplete' });

    const stars = cel.element.querySelectorAll('.star');
    const confetti = cel.element.querySelectorAll('.confetti');
    expect(stars.length).toBeGreaterThanOrEqual(5);
    expect(confetti.length).toBeGreaterThanOrEqual(10);
  });

  it('trigger() with mascot respects prefers-reduced-motion (no confetti)', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const cel = createCelebration();
    const mascot = track(createMascot({ pose: 'idle' }));

    cel.trigger({ mascot, pose: 'cheer', phraseKey: 'stepComplete' });

    expect(cel.element.querySelectorAll('.star').length).toBe(0);
    expect(cel.element.querySelectorAll('.confetti').length).toBe(0);
  });
});
