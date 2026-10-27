import { describe, it, expect, vi } from 'vitest';

// jsdom may not expose PointerEvent globally — polyfill if missing.
if (typeof (globalThis as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId = 1;
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  // @ts-expect-error - polyfill global
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

import { createChunkTray } from '../components/ChunkTray';
import type { PhonemeChunk } from '../types/phoneme-manifest';

const chunks: PhonemeChunk[] = [
  { text: 'b', clip: 'b' },
  { text: 'il', clip: 'il' },
];

describe('createChunkTray', () => {
  it('creates one tile per chunk', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    const tiles = tray.element.querySelectorAll('[data-tile-index]');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].textContent).toBe('b');
    expect(tiles[1].textContent).toBe('il');
  });

  it('has Swedish aria-label on container', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    expect(tray.element.getAttribute('aria-label')).toBe('Ljud att dra med');
  });

  it('tiles have min 88×88px', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    const tile = tray.element.querySelector<HTMLElement>('[data-tile-index="0"]')!;
    expect(tile.style.minWidth).toBe('88px');
    expect(tile.style.minHeight).toBe('88px');
  });

  it('tiles have touch-action: none and cursor: grab', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    const tile = tray.element.querySelector<HTMLElement>('[data-tile-index="0"]')!;
    expect(tile.style.touchAction).toBe('none');
    expect(tile.style.cursor).toBe('grab');
  });

  it('setAvailable toggles unavailable class and opacity', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    const tile = tray.element.querySelector<HTMLElement>('[data-tile-index="0"]')!;

    tray.setAvailable(0, false);
    expect(tile.classList.contains('unavailable')).toBe(true);
    expect(tile.style.opacity).toBe('0.4');

    tray.setAvailable(0, true);
    expect(tile.classList.contains('unavailable')).toBe(false);
    expect(tile.style.opacity).toBe('1');
  });

  it('setDragging toggles dragging class', () => {
    const handlers = { onDragStart: () => {}, onDragEnd: () => {} };
    const tray = createChunkTray(chunks, handlers);
    const tile = tray.element.querySelector<HTMLElement>('[data-tile-index="0"]')!;

    tray.setDragging(0, true);
    expect(tile.classList.contains('dragging')).toBe(true);

    tray.setDragging(0, false);
    expect(tile.classList.contains('dragging')).toBe(false);
  });

  it('destroy() removes pointerdown listeners', () => {
    const handlers = {
      onDragStart: vi.fn(),
      onDragEnd: () => {},
    };
    const tray = createChunkTray(chunks, handlers);
    const tile = tray.element.querySelector<HTMLElement>('[data-tile-index="0"]')!;

    tray.destroy();
    // After destroy, pointerdown should not fire onDragStart.
    tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(handlers.onDragStart).not.toHaveBeenCalled();
  });
});