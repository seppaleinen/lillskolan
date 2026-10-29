/**
 * Celebration — confetti and shooting stars burst on step completion.
 *
 * Purely decorative animation layer for celebrating correct word completion.
 * Respects prefers-reduced-motion. GPU-composited CSS animations only.
 *
 * Usage:
 *   const celebration = createCelebration();
 *   container.appendChild(celebration.element);
 *   celebration.trigger(); // on success
 *   celebration.destroy(); // on cleanup
 */

import type { MascotInstance, MascotPose, MascotPhraseKey } from '../utils/mascot';
import { pickPhrase } from '../utils/mascot';

export interface CelebrationTriggerOptions {
  mascot?: MascotInstance;
  pose?: MascotPose;
  phraseKey?: MascotPhraseKey;
}

export interface Celebration {
  element: HTMLElement;
  trigger(options?: CelebrationTriggerOptions): void;
  destroy(): void;
}

const STAR_COUNT = 6;
const CONFETTI_COUNT = 12;
const BURST_DURATION_MS = 1500;

// Kid-friendly color palette
const COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12'];

export function createCelebration(): Celebration {
  const container = document.createElement('div');
  container.className = 'celebration';
  container.setAttribute('aria-hidden', 'true');

  let cleanupTimer: number | null = null;

  function clearBurst(): void {
    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
    container.innerHTML = '';
  }

  function trigger(options?: CelebrationTriggerOptions): void {
    // Guard for motion-sensitive users
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // Optional mascot integration
    if (options?.mascot) {
      options.mascot.setPose(options.pose ?? 'cheer');
      const phraseKey = options.phraseKey ?? 'celebrate';
      const phrase = pickPhrase(phraseKey);
      if (phrase) {
        options.mascot.setSpeech(phrase);
      }
    }

    clearBurst();

    // Create shooting stars
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      const startX = Math.random() * 100;
      const startY = Math.random() * 50;
      const hue = COLORS[Math.floor(Math.random() * COLORS.length)];
      const duration = 1.0 + Math.random() * 0.5;
      const delay = -Math.random() * 0.3;

      star.style.setProperty('--star-x', `${startX}%`);
      star.style.setProperty('--star-y', `${startY}%`);
      star.style.setProperty('--star-color', hue);
      star.style.setProperty('--star-duration', `${duration}s`);
      star.style.setProperty('--star-delay', `${delay}s`);

      container.appendChild(star);
    }

    // Create confetti
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const confetti = document.createElement('span');
      confetti.className = 'confetti';
      const startX = Math.random() * 100;
      const hue = COLORS[Math.floor(Math.random() * COLORS.length)];
      const duration = 1.2 + Math.random() * 0.4;
      const delay = -Math.random() * 0.2;
      const rotation = Math.random() * 360;

      confetti.style.setProperty('--confetti-x', `${startX}%`);
      confetti.style.setProperty('--confetti-color', hue);
      confetti.style.setProperty('--confetti-duration', `${duration}s`);
      confetti.style.setProperty('--confetti-delay', `${delay}s`);
      confetti.style.setProperty('--confetti-rotation', `${rotation}deg`);

      container.appendChild(confetti);
    }

    cleanupTimer = window.setTimeout(() => {
      clearBurst();
    }, BURST_DURATION_MS);
  }

  function destroy(): void {
    clearBurst();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  return { element: container, trigger, destroy };
}