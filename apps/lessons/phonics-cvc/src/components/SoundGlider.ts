/**
 * SoundGlider — drop-target slots for the phoneme chunks.
 *
 * Purely presentational: the DragSession orchestrator handles pointer/drop
 * logic. Slots are min 88×88px, dashed when empty, solid when filled.
 *
 * Container has class `sound-glider`; slots have `data-slot-index`,
 * classes `glider-slot`, `filled`, `active`.
 */

import type { PhonemeChunk } from '../types/phoneme-manifest';
import { toDisplayCase, type CaseMode } from '../utils/displayCase';

export interface SoundGliderHandlers {
  onDrop(tileIndex: number, slotIndex: number): void;
}

export interface SoundGlider {
  element: HTMLElement;
  renderStep(chunks: PhonemeChunk[]): void;
  markSlotFilled(slotIndex: number, chunk: PhonemeChunk): void;
  setActiveSlot(slotIndex: number | null): void;
  setLocked(locked: boolean): void;
  destroy(): void;
}

export function createSoundGlider(
  chunks: PhonemeChunk[],
  _handlers: SoundGliderHandlers,
  caseMode?: CaseMode
): SoundGlider {
  const container = document.createElement('div');
  container.className = 'sound-glider';
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.gap = '1rem';
  container.style.padding = '1rem';
  container.style.minHeight = '120px';

  let slots: HTMLElement[] = [];

  function buildSlots(chunkList: PhonemeChunk[]): void {
    container.innerHTML = '';
    slots = [];

    chunkList.forEach((_chunk, index) => {
      const slot = document.createElement('div');
      slot.className = 'glider-slot';
      slot.setAttribute('data-slot-index', String(index));
      slot.style.minWidth = '88px';
      slot.style.minHeight = '88px';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.border = '2px dashed #4a90d9';
      slot.style.borderRadius = '12px';
      slot.style.background = '#f8f9fa';
      slot.style.fontSize = '1.5rem';
      slot.style.fontWeight = 'bold';
      slot.style.color = '#4a90d9';
      slot.style.transition = 'all 0.15s ease';
      slot.textContent = '';

      slots.push(slot);
      container.appendChild(slot);
    });
  }

  function markSlotFilled(slotIndex: number, chunk: PhonemeChunk): void {
    if (slotIndex < 0 || slotIndex >= slots.length) return;
    const slot = slots[slotIndex];
    slot.classList.add('filled');
    slot.style.borderStyle = 'solid';
    slot.style.background = '#4a90d9';
    slot.style.color = '#fff';
    slot.textContent = toDisplayCase(chunk.text, caseMode);
  }

  function setActiveSlot(slotIndex: number | null): void {
    slots.forEach((slot, i) => {
      if (i === slotIndex) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });
  }

  function setLocked(lockedState: boolean): void {
    slots.forEach((slot) => {
      if (lockedState) {
        slot.style.opacity = '0.6';
      } else {
        slot.style.opacity = '1';
      }
    });
  }

  function destroy(): void {
    container.innerHTML = '';
    slots = [];
  }

  buildSlots(chunks);

  return { element: container, renderStep: buildSlots, markSlotFilled, setActiveSlot, setLocked, destroy };
}