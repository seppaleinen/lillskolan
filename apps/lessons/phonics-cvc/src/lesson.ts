/**
 * Lesson page - main entry point for phonics-cvc lesson.
 * Integrates TapToStart gate, phoneme grid, and audio engine.
 * All content in Swedish.
 */

import { createTapToStartGate } from './components/TapToStartGate';
import { createPhonemeGrid } from './components/PhonemeGrid';
import { WebAudioPhonemeEngine } from './audio/PhonemeEngine';
import type { PhonemeManifest, PhonemeWord, PhonemeChunk, PhonemePass } from './types/phoneme-manifest';

let currentWordIndex = 0;
let currentPass = 1; // 1 = onset+rim, 2 = onset+vowel+coda
let audioEngine: WebAudioPhonemeEngine | null = null;
let manifest: PhonemeManifest | null = null;

/**
 * Render the lesson page into a container element.
 */
export function renderLesson(container: HTMLElement): void {
  // Initialize audio engine
  audioEngine = new WebAudioPhonemeEngine();

  // Load manifest
  loadManifest().then(() => {
    // Show tap-to-start gate
    const gate = createTapToStartGate(async () => {
      // On first tap: load audio engine, remove gate, show lesson
      if (audioEngine && manifest) {
        await audioEngine.load(manifest);
      }
      gate.remove();
      showLesson(container);
    });
    container.appendChild(gate.element);
  });
}

/**
 * Load the phoneme manifest from public.
 */
async function loadManifest(): Promise<void> {
  const response = await fetch('/manifest/phoneme-manifest.json');
  manifest = await response.json();
}

/**
 * Show the lesson UI after tap-to-start is complete.
 */
function showLesson(container: HTMLElement): void {
  container.innerHTML = '';
  container.className = 'lesson-container';

  // Header
  const header = document.createElement('h1');
  header.textContent = 'Läsläs: CVC';
  container.appendChild(header);

  // Word display
  const wordDisplay = document.createElement('div');
  wordDisplay.className = 'word-display';
  wordDisplay.textContent = getCurrentWord().id;
  container.appendChild(wordDisplay);

  // Pass indicator
  const passIndicator = document.createElement('div');
  passIndicator.className = 'pass-indicator';
  passIndicator.textContent = `Omgång ${currentPass} av 2`;
  container.appendChild(passIndicator);

  // Phoneme grid - map new manifest format to component format (clipId)
  const word = getCurrentWord();
  const passChunks: PhonemeChunk[] = currentPass === 1 ? word.passes[0].chunks : word.passes[1].chunks;
  const chunks = passChunks.map(chunk => ({ text: chunk.text, clipId: chunk.clip }));

  const grid = createPhonemeGrid(chunks, handlePlayClip);
  container.appendChild(grid);

  // Navigation
  const navContainer = document.createElement('div');
  navContainer.className = 'nav-container';

  const prevButton = document.createElement('button');
  prevButton.textContent = 'Föregående';
  prevButton.disabled = currentWordIndex === 0;
  prevButton.onclick = handlePrevious;
  navContainer.appendChild(prevButton);

  const nextButton = document.createElement('button');
  nextButton.textContent = 'Nästa';
  nextButton.onclick = handleNext;
  navContainer.appendChild(nextButton);

  container.appendChild(navContainer);
}

/**
 * Get the current word from the manifest.
 */
function getCurrentWord(): PhonemeWord {
  if (!manifest || manifest.words.length === 0) {
    throw new Error('Inget manifest laddat');
  }
  return manifest.words[currentWordIndex];
}

/**
 * Handle playing a phoneme clip.
 */
async function handlePlayClip(clipId: string): Promise<void> {
  if (!audioEngine) return;
  audioEngine.play(clipId);
}

/**
 * Navigate to previous word.
 */
function handlePrevious(): void {
  if (currentWordIndex > 0) {
    currentWordIndex--;
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      showLesson(app);
    }
  }
}

/**
 * Navigate to next word or advance pass.
 */
function handleNext(): void {
  if (currentPass === 1) {
    // Advance to pass 2 for same word
    currentPass = 2;
  } else {
    // Move to next word, reset to pass 1
    currentPass = 1;
    if (currentWordIndex < (manifest?.words.length ?? 0) - 1) {
      currentWordIndex++;
    }
  }
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    showLesson(app);
  }
}