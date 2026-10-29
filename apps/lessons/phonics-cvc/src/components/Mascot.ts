/**
 * Skogslingan mascot component.
 *
 * Factory function that creates a mascot instance with pose and speech bubble support.
 * Inlines SVG sprite, injects CSS animations idempotently.
 *
 * Usage:
 *   const mascot = createMascot({ pose: 'idle', speech: 'Bra jobbat!' });
 *   container.appendChild(mascot.element);
 *   mascot.setPose('cheer');
 *   mascot.setSpeech('Du klarade det!');
 *   mascot.destroy();
 */

import mascotSvg from './Mascot.svg?raw';
import type { MascotPose, MascotOptions, MascotInstance } from '../utils/mascot';

const CSS_STYLES = `
@keyframes mascot-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.03); } }
@keyframes mascot-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8%) scaleY(0.95); } }
@keyframes mascot-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes mascot-tilt { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }

.mascot .mascot-layer { display: none; transform-box: fill-box; transform-origin: center bottom; }
.mascot[data-pose="idle"]       .mascot-layer--idle       { display: block; animation: mascot-breathe  var(--mascot-idle-duration, 2.8s) ease-in-out infinite; }
.mascot[data-pose="cheer"]      .mascot-layer--cheer      { display: block; animation: mascot-bounce   var(--mascot-cheer-duration, 0.7s) ease-in-out infinite; }
.mascot[data-pose="celebrate"]  .mascot-layer--celebrate  { display: block; animation: mascot-spin     var(--mascot-celebrate-duration, 1.4s) linear infinite; }
.mascot[data-pose="thinking"]   .mascot-layer--thinking   { display: block; animation: mascot-tilt     var(--mascot-thinking-duration, 1.8s) ease-in-out infinite; }

.mascot__bubble { position: absolute; bottom: calc(var(--mascot-size) + 8px); left: 50%; transform: translateX(-50%); background: var(--mascot-bubble-bg, #fffbe6); color: var(--mascot-bubble-ink, #2d2d2d); padding: 6px 12px; border-radius: 16px; font: 500 14px/1.3 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.15); pointer-events: none; z-index: 10; }
.mascot__bubble::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 8px solid transparent; border-top-color: var(--mascot-bubble-bg, #fffbe6); }

@media (prefers-reduced-motion: reduce) { .mascot .mascot-layer { animation: none !important; } }

.mascot { --mascot-size: 96px; --mascot-idle-duration: 2.8s; --mascot-cheer-duration: 0.7s; --mascot-celebrate-duration: 1.4s; --mascot-thinking-duration: 1.8s; --mascot-bubble-bg: #fffbe6; --mascot-bubble-ink: #2d2d2d; }
`;

let styleElement: HTMLStyleElement | null = null;
let instanceCount = 0;

function injectStyles(): void {
  if (styleElement && styleElement.parentNode) return;
  styleElement = document.createElement('style');
  styleElement.id = 'mascot-styles';
  styleElement.type = 'text/css';
  styleElement.textContent = CSS_STYLES;
  document.head.appendChild(styleElement);
}

function removeStyles(): void {
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement);
    styleElement = null;
  }
}

export function createMascot(options?: MascotOptions): MascotInstance {
  injectStyles();
  instanceCount++;

  const {
    pose = 'idle',
    speech = null,
    size = 96,
    className = '',
  } = options ?? {};

  const wrapper = document.createElement('div');
  wrapper.className = `mascot ${className}`.trim();
  wrapper.setAttribute('data-pose', pose);
  wrapper.style.position = 'relative';
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.setProperty('--mascot-size', `${size}px`);

  // Inline SVG sprite
  wrapper.innerHTML = mascotSvg;
  const svg = wrapper.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Skogslingan');
  }

  // Speech bubble
  const bubble = document.createElement('div');
  bubble.className = 'mascot__bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  if (!speech) {
    bubble.hidden = true;
  } else {
    bubble.textContent = speech;
  }
  wrapper.appendChild(bubble);

  function setPose(newPose: MascotPose): void {
    if (wrapper.getAttribute('data-pose') === newPose) return;
    wrapper.setAttribute('data-pose', newPose);
  }

  function setSpeech(text: string | null): void {
    if (!text) {
      bubble.hidden = true;
      bubble.textContent = '';
    } else {
      bubble.textContent = text;
      bubble.hidden = false;
    }
  }

  function destroy(): void {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    instanceCount--;
    if (instanceCount === 0) {
      removeStyles();
    }
  }

  return {
    element: wrapper,
    setPose,
    setSpeech,
    destroy,
  };
}
