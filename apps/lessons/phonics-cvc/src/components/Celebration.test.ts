import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCelebration } from './Celebration';

describe('createCelebration', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns element with class celebration and aria-hidden="true"', () => {
    const cel = createCelebration();
    expect(cel.element).toBeInstanceOf(HTMLElement);
    expect(cel.element.classList.contains('celebration')).toBe(true);
    expect(cel.element.getAttribute('aria-hidden')).toBe('true');
    expect(typeof cel.trigger).toBe('function');
    expect(typeof cel.destroy).toBe('function');
  });

  it('trigger() spawns star and confetti children', () => {
    const cel = createCelebration();

    cel.trigger();

    const stars = cel.element.querySelectorAll('.star');
    const confetti = cel.element.querySelectorAll('.confetti');

    // Star count 6, confetti 12 — total 18 < 25
    expect(stars.length).toBeGreaterThanOrEqual(5);
    expect(stars.length).toBeLessThanOrEqual(7);
    expect(confetti.length).toBeGreaterThanOrEqual(10);
    expect(confetti.length).toBeLessThanOrEqual(14);

    // Particles have inline CSS custom properties for start position/color
    const star = stars[0] as HTMLElement;
    expect(star.style.getPropertyValue('--star-x')).toBeTruthy();
    expect(star.style.getPropertyValue('--star-color')).toBeTruthy();

    const c = confetti[0] as HTMLElement;
    expect(c.style.getPropertyValue('--confetti-x')).toBeTruthy();
    expect(c.style.getPropertyValue('--confetti-color')).toBeTruthy();
  });

  it('trigger() respects prefers-reduced-motion', () => {
    // Mock matchMedia reporting reduced motion
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const cel = createCelebration();
    cel.trigger();

    expect(cel.element.querySelectorAll('.star').length).toBe(0);
    expect(cel.element.querySelectorAll('.confetti').length).toBe(0);
  });

  it('particles auto-clear after ~1.5s', () => {
    vi.useFakeTimers();

    const cel = createCelebration();
    cel.trigger();

    expect(cel.element.childElementCount).toBeGreaterThan(0);

    vi.advanceTimersByTime(1500);

    expect(cel.element.childElementCount).toBe(0);
  });

  it('second trigger() cancels previous burst and replaces particles', () => {
    vi.useFakeTimers();

    const cel = createCelebration();
    cel.trigger();
    const firstTimerId = Date.now(); // placeholder

    vi.advanceTimersByTime(1000);
    cel.trigger(); // should cancel previous timer and clear old particles

    // After re-trigger, element should contain a fresh burst (no accumulation)
    const total = cel.element.childElementCount;
    expect(total).toBeGreaterThanOrEqual(17); // 6 stars + 12 confetti
    expect(total).toBeLessThanOrEqual(25);

    // First timer should have been cancelled — advancing 600ms should NOT clear yet
    // (first timer would fire at 1500ms from first trigger; 1000+600=1600ms)
    vi.advanceTimersByTime(600);
    expect(cel.element.childElementCount).toBeGreaterThan(0);

    // Second timer fires at 1000+1500=2500ms total
    vi.advanceTimersByTime(900);
    expect(cel.element.childElementCount).toBe(0);
  });

  it('destroy() removes element from parent and cancels pending timers', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    const cel = createCelebration();
    parent.appendChild(cel.element);

    cel.trigger();
    expect(parent.contains(cel.element)).toBe(true);
    expect(cel.element.childElementCount).toBeGreaterThan(0);

    // Spy on clearTimeout to ensure timer cancellation
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    cel.destroy();

    expect(parent.contains(cel.element)).toBe(false);
    expect(cel.element.childElementCount).toBe(0);
    expect(clearSpy).toHaveBeenCalled();

    // Advancing timers should not cause errors after destroy
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    // No exception thrown is success
  });
});
