/**
 * DragSession — shared pointer-drag orchestrator.
 *
 * Listens at `document` level so drags survive leaving element bounds.
 * Creates a fixed-position ghost element that follows the pointer.
 * Feature-detects `setPointerCapture` (jsdom lacks it → guarded).
 */

export interface DragSessionOptions {
  root: HTMLElement;
  getDraggable: (el: Element | null) => number | null;
  onDrop: (tileIndex: number, clientX: number, clientY: number) => void;
}

export interface DragSession {
  setPointerActive(tileIndex: number | null): void;
  destroy(): void;
}

export function createDragSession(opts: DragSessionOptions): DragSession {
  const { root, getDraggable, onDrop } = opts;

  let activeTileIndex: number | null = null;
  let dragStarted = false;
  let ghost: HTMLElement | null = null;
  let ghostText = '';
  let pointerId: number | null = null;

  function makeGhost(text: string): HTMLElement {
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.textContent = text;
    g.style.position = 'fixed';
    g.style.left = '0px';
    g.style.top = '0px';
    g.style.width = '88px';
    g.style.height = '88px';
    g.style.pointerEvents = 'none';
    g.style.zIndex = '2000';
    g.style.display = 'flex';
    g.style.alignItems = 'center';
    g.style.justifyContent = 'center';
    g.style.background = '#4a90d9';
    g.style.color = '#fff';
    g.style.borderRadius = '12px';
    g.style.fontSize = '1.5rem';
    g.style.fontWeight = 'bold';
    g.style.transform = 'translate(-50%, -120%)';
    g.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(g);
    return g;
  }

  function positionGhost(x: number, y: number): void {
    if (!ghost) return;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  function onPointerDown(e: PointerEvent): void {
    if (activeTileIndex !== null) return;

    const target = e.target as Element | null;
    const tileIndex = getDraggable(target);
    if (tileIndex === null) return;

    activeTileIndex = tileIndex;
    dragStarted = false;
    pointerId = e.pointerId;

    // Resolve chunk text from the tile element.
    const tileEl = target?.closest('[data-tile-index]') as HTMLElement | null;
    ghostText = tileEl?.textContent ?? '';

    // Feature-detect setPointerCapture.
    const el = e.target as HTMLElement;
    if (el && typeof (el as any).setPointerCapture === 'function') {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Capture failed — fall back to document-level listeners.
      }
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (activeTileIndex === null) return;
    if (!dragStarted) {
      dragStarted = true;
      ghost = makeGhost(ghostText);
    }
    positionGhost(e.clientX, e.clientY);
  }

  function cleanupDrag(): void {
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    activeTileIndex = null;
    pointerId = null;
    dragStarted = false;
  }

  function onPointerUp(e: PointerEvent): void {
    if (activeTileIndex === null) return;
    const tileIndex = activeTileIndex;
    const x = e.clientX;
    const y = e.clientY;
    const didStartDrag = dragStarted;

    // Release capture (guarded).
    const el = e.target as HTMLElement;
    if (el && typeof (el as any).releasePointerCapture === 'function') {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore.
      }
    }

    cleanupDrag();

    if (didStartDrag) {
      onDrop(tileIndex, x, y);
    }
  }

  function onPointerCancel(e: PointerEvent): void {
    if (activeTileIndex === null) return;
    const el = e.target as HTMLElement;
    if (el && typeof (el as any).releasePointerCapture === 'function') {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore.
      }
    }
    cleanupDrag();
  }

  document.addEventListener('pointerdown', onPointerDown as EventListener);
  document.addEventListener('pointermove', onPointerMove as EventListener);
  document.addEventListener('pointerup', onPointerUp as EventListener);
  document.addEventListener('pointercancel', onPointerCancel as EventListener);

  function setPointerActive(tileIndex: number | null): void {
    activeTileIndex = tileIndex;
  }

  function destroy(): void {
    document.removeEventListener('pointerdown', onPointerDown as EventListener);
    document.removeEventListener('pointermove', onPointerMove as EventListener);
    document.removeEventListener('pointerup', onPointerUp as EventListener);
    document.removeEventListener('pointercancel', onPointerCancel as EventListener);
    cleanupDrag();
  }

  return { setPointerActive, destroy };
}