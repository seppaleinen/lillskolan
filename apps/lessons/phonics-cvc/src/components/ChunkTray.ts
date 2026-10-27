/**
 * ChunkTray — draggable phoneme tiles.
 *
 * Tiles are min 88×88px, `touch-action: none`, `cursor: grab`.
 * Container has Swedish aria-label "Ljud att dra med".
 * Tiles get `data-tile-index` attributes.
 */

import type { PhonemeChunk } from '../types/phoneme-manifest';

export interface ChunkTrayHandlers {
  onDragStart(tileIndex: number, pointerId: number): void;
  onDragEnd(): void;
}

export interface ChunkTray {
  element: HTMLElement;
  setAvailable(tileIndex: number, available: boolean): void;
  setDragging(tileIndex: number, dragging: boolean): void;
  destroy(): void;
}

export function createChunkTray(
  chunks: PhonemeChunk[],
  handlers: ChunkTrayHandlers
): ChunkTray {
  const container = document.createElement('div');
  container.className = 'chunk-tray';
  container.setAttribute('aria-label', 'Ljud att dra med');
  container.style.position = 'fixed';
  container.style.bottom = '0';
  container.style.left = '0';
  container.style.right = '0';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.gap = '1rem';
  container.style.padding = '1rem';
  container.style.background = 'rgba(255, 255, 255, 0.95)';
  container.style.backdropFilter = 'blur(4px)';
  container.style.borderTop = '2px solid #e0e0e0';
  container.style.zIndex = '100';

  const tiles: HTMLElement[] = [];
  const listeners: Array<{ el: HTMLElement; type: string; fn: (e: PointerEvent) => void }> = [];

  chunks.forEach((chunk, index) => {
    const tile = document.createElement('div');
    tile.className = 'chunk-tile';
    tile.setAttribute('data-tile-index', String(index));
    tile.textContent = chunk.text;
    tile.style.minWidth = '88px';
    tile.style.minHeight = '88px';
    tile.style.display = 'flex';
    tile.style.alignItems = 'center';
    tile.style.justifyContent = 'center';
    tile.style.background = '#fff';
    tile.style.border = '2px solid #4a90d9';
    tile.style.borderRadius = '12px';
    tile.style.fontSize = '1.5rem';
    tile.style.fontWeight = 'bold';
    tile.style.color = '#333';
    tile.style.cursor = 'grab';
    tile.style.touchAction = 'none';
    tile.style.transition = 'transform 0.1s ease, background 0.1s ease';

    const onPointerDown = (e: PointerEvent): void => {
      e.preventDefault();
      handlers.onDragStart(index, e.pointerId);
    };
    tile.addEventListener('pointerdown', onPointerDown);
    listeners.push({ el: tile, type: 'pointerdown', fn: onPointerDown });

    tiles.push(tile);
    container.appendChild(tile);
  });

  function setAvailable(tileIndex: number, available: boolean): void {
    const tile = tiles[tileIndex];
    if (!tile) return;
    if (available) {
      tile.style.opacity = '1';
      tile.style.cursor = 'grab';
      tile.classList.remove('unavailable');
    } else {
      tile.style.opacity = '0.4';
      tile.style.cursor = 'default';
      tile.classList.add('unavailable');
    }
  }

  function setDragging(tileIndex: number, dragging: boolean): void {
    const tile = tiles[tileIndex];
    if (!tile) return;
    if (dragging) {
      tile.classList.add('dragging');
      tile.style.cursor = 'grabbing';
    } else {
      tile.classList.remove('dragging');
      tile.style.cursor = 'grab';
    }
  }

  function destroy(): void {
    for (const { el, type, fn } of listeners) {
      el.removeEventListener(type, fn);
    }
    listeners.length = 0;
    container.innerHTML = '';
  }

  return { element: container, setAvailable, setDragging, destroy };
}