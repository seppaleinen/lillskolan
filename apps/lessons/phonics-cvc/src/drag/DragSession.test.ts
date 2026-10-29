import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createDragSession } from '../drag/DragSession';

/**
 * jsdom's PointerEvent support is unreliable — build a plain Event and attach
 * the properties DragSession actually reads (target, clientX, clientY,
 * pointerId, button). Cast to PointerEvent for the type checker.
 */
function makePointerEvent(
  type: string,
  opts: { clientX?: number; clientY?: number; pointerId?: number; button?: number; target?: Element | null } = {}
): PointerEvent {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'clientX', { value: opts.clientX ?? 0, configurable: true });
  Object.defineProperty(e, 'clientY', { value: opts.clientY ?? 0, configurable: true });
  Object.defineProperty(e, 'pointerId', { value: opts.pointerId ?? 1, configurable: true });
  Object.defineProperty(e, 'button', { value: opts.button ?? 0, configurable: true });
  if (opts.target) {
    Object.defineProperty(e, 'target', { value: opts.target, configurable: true });
  }
  return e as unknown as PointerEvent;
}

function makeTileEl(index: number): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-tile-index', String(index));
  el.textContent = 'tile' + index;
  return el;
}

describe('createDragSession', () => {
  let root: HTMLElement;
  let onDrop: ReturnType<typeof vi.fn>;
  let getDraggable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);

    onDrop = vi.fn();
    getDraggable = vi.fn((el: Element | null) => {
      if (!el) return null;
      const closest = (el as Element).closest?.('[data-tile-index]') as HTMLElement | null;
      if (!closest) return null;
      const idx = Number(closest.getAttribute('data-tile-index'));
      return Number.isNaN(idx) ? null : idx;
    });
  });

  it('pointerdown on a draggable starts a drag', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    // Dispatch pointerdown on the tile — bubbles to document-level listener.
    tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 5, target: tile }));

    // pointermove should create the ghost.
    document.dispatchEvent(makePointerEvent('pointermove', { clientX: 100, clientY: 200, pointerId: 5 }));

    const ghost = document.querySelector('.drag-ghost') as HTMLElement | null;
    expect(ghost).not.toBeNull();
    expect(ghost?.style.left).toBe('100px');
    expect(ghost?.style.top).toBe('200px');

    // pointerup fires onDrop.
    document.dispatchEvent(makePointerEvent('pointerup', { clientX: 150, clientY: 250, pointerId: 5 }));

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(0, 150, 250);
    expect(document.querySelector('.drag-ghost')).toBeNull();

    session.destroy();
  });

  it('pointercancel cleans up ghost and does not fire onDrop', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, target: tile }));
    document.dispatchEvent(makePointerEvent('pointermove', { clientX: 10, clientY: 10, pointerId: 1 }));
    expect(document.querySelector('.drag-ghost')).not.toBeNull();

    document.dispatchEvent(makePointerEvent('pointercancel', { pointerId: 1 }));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();

    session.destroy();
  });

  it('pointerdown on non-draggable does not start drag', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    // Dispatch on a non-draggable element.
    document.body.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, target: document.body }));

    document.dispatchEvent(makePointerEvent('pointermove', { clientX: 10, clientY: 10, pointerId: 1 }));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();

    session.destroy();
  });

  it('setPointerCapture is called when available (feature-detect path)', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    const setCapture = vi.fn();
    const releaseCapture = vi.fn();
    (tile as unknown as { setPointerCapture: typeof setCapture; releasePointerCapture: typeof releaseCapture }).setPointerCapture = setCapture;
    (tile as unknown as { setPointerCapture: typeof setCapture; releasePointerCapture: typeof releaseCapture }).releasePointerCapture = releaseCapture;

    tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 7, target: tile }));
    expect(setCapture).toHaveBeenCalledTimes(1);
    expect(setCapture).toHaveBeenCalledWith(7);

    // Dispatch on the tile so e.target is the tile (release path resolves via target).
    tile.dispatchEvent(makePointerEvent('pointerup', { pointerId: 7, target: tile }));
    expect(releaseCapture).toHaveBeenCalledTimes(1);
    expect(releaseCapture).toHaveBeenCalledWith(7);

    session.destroy();
  });

  it('does not throw when setPointerCapture is undefined (jsdom fallback)', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    // jsdom elements do not have setPointerCapture.
    expect(typeof (tile as unknown as { setPointerCapture?: unknown }).setPointerCapture).toBe('undefined');

    expect(() => {
      tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, target: tile }));
      document.dispatchEvent(makePointerEvent('pointermove', { clientX: 15, clientY: 15, pointerId: 1 }));
      document.dispatchEvent(makePointerEvent('pointerup', { pointerId: 1 }));
    }).not.toThrow();

    expect(onDrop).toHaveBeenCalledTimes(1);
    session.destroy();
  });

  it('destroy() removes document listeners', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    session.destroy();

    // After destroy, pointerdown should not start a drag.
    tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, target: tile }));
    document.dispatchEvent(makePointerEvent('pointermove', { clientX: 5, clientY: 5, pointerId: 1 }));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('does not start drag when pointermove is within threshold', () => {
    const session = createDragSession({ root, getDraggable, onDrop });
    const tile = makeTileEl(0);
    root.appendChild(tile);

    tile.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, target: tile }));
    // Small move within 8px threshold
    document.dispatchEvent(makePointerEvent('pointermove', { clientX: 5, clientY: 5, pointerId: 1 }));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();

    // pointerup should not trigger onDrop
    document.dispatchEvent(makePointerEvent('pointerup', { clientX: 5, clientY: 5, pointerId: 1 }));
    expect(onDrop).not.toHaveBeenCalled();

    session.destroy();
  });

});