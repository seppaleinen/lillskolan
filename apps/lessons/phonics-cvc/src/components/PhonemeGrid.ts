/**
 * Phoneme grid component - responsive grid layout that renders phoneme tiles.
 * Pass 1: 2 tiles (onset + rim), Pass 2: 3 tiles (onset + vowel + coda).
 */

import { createPhonemeTile } from './PhonemeTile';

export function createPhonemeGrid(chunks: Array<{ text: string; clipId: string }>, onPlayClip: (clipId: string) => void): HTMLDivElement {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))';
  grid.style.gap = '0.5rem';
  grid.style.width = '100%';
  grid.style.maxWidth = '400px';
  grid.style.margin = 'auto';

  chunks.forEach(chunk => {
    const tile = createPhonemeTile(chunk.text, chunk.clipId, onPlayClip);
    grid.appendChild(tile);
  });

  return grid;
}