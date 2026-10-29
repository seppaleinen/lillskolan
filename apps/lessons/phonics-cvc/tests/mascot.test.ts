import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMascot } from '../src/components/Mascot';
import type { MascotPose } from '../src/utils/mascot';

/**
 * Tracks all mascot instances created in the test so afterEach can destroy
 * them and let the shared style element be removed (count-based teardown).
 */
const activeMascots: Array<ReturnType<typeof createMascot>> = [];

function track(mascot: ReturnType<typeof createMascot>): ReturnType<typeof createMascot> {
  activeMascots.push(mascot);
  return mascot;
}

beforeEach(() => {
  activeMascots.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Destroy every mascot created during the test (idempotent-safe).
  for (const m of activeMascots) {
    try {
      m.destroy();
    } catch {
      // ignore
    }
  }
  activeMascots.length = 0;
  // Safety net: remove any lingering style tag.
  const styleEl = document.getElementById('mascot-styles');
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
});

describe('createMascot', () => {
  it('returns element with correct structure and attributes', () => {
    const mascot = track(createMascot());

    expect(mascot.element).toBeInstanceOf(HTMLElement);
    expect(mascot.element.classList.contains('mascot')).toBe(true);
    expect(mascot.element.getAttribute('data-pose')).toBe('idle');
    expect(typeof mascot.setPose).toBe('function');
    expect(typeof mascot.setSpeech).toBe('function');
    expect(typeof mascot.destroy).toBe('function');
  });

  it('accepts custom pose option', () => {
    const mascot = track(createMascot({ pose: 'cheer' }));
    expect(mascot.element.getAttribute('data-pose')).toBe('cheer');
  });

  it('accepts custom size option', () => {
    const mascot = track(createMascot({ size: 120 }));
    expect(mascot.element.style.width).toBe('120px');
    expect(mascot.element.style.height).toBe('120px');
    expect(mascot.element.style.getPropertyValue('--mascot-size')).toBe('120px');
  });

  it('accepts custom className option', () => {
    const mascot = track(createMascot({ className: 'custom-class' }));
    expect(mascot.element.classList.contains('custom-class')).toBe(true);
  });

  it('inlines SVG sprite with correct attributes', () => {
    const mascot = track(createMascot());
    const svg = mascot.element.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('100%');
    expect(svg?.getAttribute('height')).toBe('100%');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Skogslingan');
  });

  it('contains all four pose symbols in SVG', () => {
    const mascot = track(createMascot());
    const svg = mascot.element.querySelector('svg');
    expect(svg?.querySelector('#mascot-idle')).toBeTruthy();
    expect(svg?.querySelector('#mascot-cheer')).toBeTruthy();
    expect(svg?.querySelector('#mascot-celebrate')).toBeTruthy();
    expect(svg?.querySelector('#mascot-thinking')).toBeTruthy();
  });

  it('has speech bubble with correct attributes', () => {
    const mascot = track(createMascot());
    const bubble = mascot.element.querySelector('.mascot__bubble');
    expect(bubble).toBeTruthy();
    expect(bubble?.getAttribute('role')).toBe('status');
    expect(bubble?.getAttribute('aria-live')).toBe('polite');
    expect(bubble?.hidden).toBe(true);
  });

  it('setPose updates data-pose attribute', () => {
    const mascot = track(createMascot({ pose: 'idle' }));
    expect(mascot.element.getAttribute('data-pose')).toBe('idle');

    mascot.setPose('cheer');
    expect(mascot.element.getAttribute('data-pose')).toBe('cheer');

    mascot.setPose('celebrate');
    expect(mascot.element.getAttribute('data-pose')).toBe('celebrate');

    mascot.setPose('thinking');
    expect(mascot.element.getAttribute('data-pose')).toBe('thinking');
  });

  it('setPose is idempotent (no setAttribute call if same pose)', () => {
    const mascot = track(createMascot({ pose: 'idle' }));
    const setAttrSpy = vi.spyOn(mascot.element, 'setAttribute');
    mascot.setPose('idle');
    expect(setAttrSpy).not.toHaveBeenCalled();
  });

  it('setSpeech sets bubble text and shows it', () => {
    const mascot = track(createMascot({ speech: null }));
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    expect(bubble.hidden).toBe(true);
    expect(bubble.textContent).toBe('');

    mascot.setSpeech('Bra jobbat!');
    expect(bubble.hidden).toBe(false);
    expect(bubble.textContent).toBe('Bra jobbat!');
  });

  it('setSpeech with null hides bubble', () => {
    const mascot = track(createMascot({ speech: 'Hello' }));
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;
    expect(bubble.hidden).toBe(false);

    mascot.setSpeech(null);
    expect(bubble.hidden).toBe(true);
    expect(bubble.textContent).toBe('');
  });

  it('setSpeech with empty string hides bubble', () => {
    const mascot = track(createMascot({ speech: 'Hello' }));
    const bubble = mascot.element.querySelector('.mascot__bubble') as HTMLElement;

    mascot.setSpeech('');
    expect(bubble.hidden).toBe(true);
    expect(bubble.textContent).toBe('');
  });

  it('destroy removes element from DOM', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const mascot = track(createMascot());
    parent.appendChild(mascot.element);

    expect(parent.contains(mascot.element)).toBe(true);

    mascot.destroy();

    expect(parent.contains(mascot.element)).toBe(false);
  });

  it('handles multiple rapid setPose calls correctly', () => {
    const mascot = track(createMascot({ pose: 'idle' }));
    const poses: MascotPose[] = ['cheer', 'celebrate', 'thinking', 'idle'];
    for (const pose of poses) {
      mascot.setPose(pose);
      expect(mascot.element.getAttribute('data-pose')).toBe(pose);
    }
  });

  it('injected CSS respects prefers-reduced-motion', () => {
    track(createMascot({ pose: 'idle' }));
    const styleEl = document.getElementById('mascot-styles');
    const css = styleEl?.textContent ?? '';
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('animation: none !important');
  });

  it('injects CSS custom properties for animation durations and bubble colors', () => {
    track(createMascot());
    const styleEl = document.getElementById('mascot-styles');
    const css = styleEl?.textContent ?? '';
    expect(css).toContain('--mascot-idle-duration');
    expect(css).toContain('--mascot-cheer-duration');
    expect(css).toContain('--mascot-celebrate-duration');
    expect(css).toContain('--mascot-thinking-duration');
    expect(css).toContain('--mascot-bubble-bg');
    expect(css).toContain('--mascot-bubble-ink');
  });

  it('has default touch target size 96x96 (>= 88x88)', () => {
    const mascot = track(createMascot());
    expect(mascot.element.style.width).toBe('96px');
    expect(mascot.element.style.height).toBe('96px');
  });

  it('only one mascot-style element is injected for multiple instances', () => {
    track(createMascot());
    track(createMascot());
    track(createMascot());
    const styles = document.querySelectorAll('#mascot-styles');
    expect(styles.length).toBe(1);
  });

  it('style injection is idempotent when style element is removed externally', () => {
    // Create a mascot - styles injected
    const mascot1 = track(createMascot());
    expect(document.getElementById('mascot-styles')).toBeTruthy();

    // Simulate external removal of styles
    const styleEl = document.getElementById('mascot-styles');
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    expect(document.getElementById('mascot-styles')).toBeNull();

    // Create another mascot - styles should be re-injected
    const mascot2 = track(createMascot());
    expect(document.getElementById('mascot-styles')).toBeTruthy();
  });
});