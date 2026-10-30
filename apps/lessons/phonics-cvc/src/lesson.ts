/**
 * Lesson page - main entry point for the phonics-cvc lesson.
 *
 * Flow:
 * 1. Create WebAudioPhonemeEngine, load manifest, show TapToStartGate.
 * 2. On start: engine.load, record start time, remove gate, build lesson UI.
 * 3. Lesson UI: header, word display, pass indicator, step counter,
 *    SoundGlider, ChunkTray, advance button.
 * 4. Drag tiles from tray to glider slots; wrong drops shake the tile.
 * 5. On step complete: blended playback + bridge progress event.
 * 6. On final step complete: CompletionScreen + bridge sendComplete.
 * 7. pagehide / visibilitychange → cleanup (engine, DOM, bridge).
 *
 * All content in Swedish.
 */

import { createTapToStartGate } from './components/TapToStartGate';
import { createSoundGlider } from './components/SoundGlider';
import { createChunkTray } from './components/ChunkTray';
import { createCompletionScreen } from './components/CompletionScreen';
import { createCelebration } from './components/Celebration';
import { createMascot } from './components/Mascot';
import { createDragSession } from './drag/DragSession';
import { WebAudioPhonemeEngine } from './audio/PhonemeEngine';
import { playBlended } from './audio/BlendPlayer';
import { createLessonMachine, type LessonMachine, type TileOption } from './state/lesson-machine';
import { getLessonBridge, destroyLessonBridge } from './bridge';
import { createReturnMessage } from './return-protocol';
import { HUB_ORIGIN } from './config';
import { toDisplayCase, type CaseMode } from './utils/displayCase';
import type { PhonemeManifest, PhonemeChunk } from './types/phoneme-manifest';
import { pickPhrase, poseFor } from './utils/mascot';

let audioEngine: WebAudioPhonemeEngine | null = null;
let manifest: PhonemeManifest | null = null;
let machine: LessonMachine | null = null;
let lessonStartTime = 0;
let lessonRoot: HTMLElement | null = null;
let lessonDestroyed = false;
let cleanupWired = false;

/**
 * Render the lesson page into a container element.
 */
export function renderLesson(container: HTMLElement): void {
  // Fresh module state on every render.
  lessonDestroyed = false;
  cleanupWired = false;
  pendingComponentCleanups = [];

  audioEngine = new WebAudioPhonemeEngine();
  lessonRoot = container;

  loadManifest()
    .then(() => {
      if (lessonDestroyed) return;
      const gate = createTapToStartGate(async () => {
        if (lessonDestroyed) return;
        if (audioEngine && manifest) {
          await audioEngine.load(manifest);
        }
        lessonStartTime = performance.now();
        gate.remove();
        showLesson(container);
      });
      container.appendChild(gate.element);
    })
    .catch((error) => {
      console.error('[lesson] Failed to load manifest:', error);
    });
}

/**
 * Load the phoneme manifest from public.
 */
async function loadManifest(): Promise<PhonemeManifest> {
  const response = await fetch('/manifest/phoneme-manifest.json');
  manifest = (await response.json()) as PhonemeManifest;
  return manifest;
}

/**
 * Show the lesson UI after tap-to-start is complete.
 */
function showLesson(container: HTMLElement): void {
  if (!manifest || !audioEngine) return;

  machine = createLessonMachine(manifest);
  const caseMode: CaseMode = manifest.caseMode ?? 'upper';

  container.innerHTML = '';
  container.className = 'lesson-container';

  // Header
  const header = document.createElement('h1');
  header.className = 'lesson-header';
  header.textContent = 'Läsläs: CVC';
  container.appendChild(header);

  // Word display + speaker button
  const wordSection = document.createElement('div');
  wordSection.className = 'word-section';
  wordSection.style.display = 'flex';
  wordSection.style.alignItems = 'center';
  wordSection.style.justifyContent = 'center';
  wordSection.style.gap = '0.5rem';
  container.appendChild(wordSection);

  const wordDisplay = document.createElement('div');
  wordDisplay.className = 'word-display';
  wordDisplay.style.cursor = 'pointer';
  wordSection.appendChild(wordDisplay);

  // Speaker button — visible replay affordance next to the word.
  const speakerBtn = document.createElement('button');
  speakerBtn.className = 'speaker-btn';
  speakerBtn.textContent = '🔊';
  speakerBtn.style.background = 'none';
  speakerBtn.style.border = 'none';
  speakerBtn.style.cursor = 'pointer';
  speakerBtn.style.fontSize = '1.5rem';
  speakerBtn.style.padding = '0.25rem 0.5rem';
  speakerBtn.style.borderRadius = '8px';
  speakerBtn.style.color = '#4a90d9';
  speakerBtn.style.touchAction = 'none';
  speakerBtn.setAttribute('aria-label', 'Läss ordet');
  wordSection.appendChild(speakerBtn);

  async function replayWord(): Promise<void> {
    if (!machine || !audioEngine || !audioEngine.isReady()) return;
    const stepState = machine.getCurrentStep();
    try {
      audioEngine.stop();
      statusLine.textContent = 'Läser ordet…';
      await playBlended(audioEngine, stepState.chunks, 0.85);
    } catch {
      // Ignore playback errors
    } finally {
      statusLine.textContent = '';
    }
  }

  wordDisplay.addEventListener('click', () => { void replayWord(); });
  speakerBtn.addEventListener('click', () => { void replayWord(); });

  // Pass indicator
  const passIndicator = document.createElement('div');
  passIndicator.className = 'pass-indicator';
  container.appendChild(passIndicator);

  // Step counter
  const stepCounter = document.createElement('div');
  stepCounter.className = 'step-counter';
  container.appendChild(stepCounter);

  // Status line (blend status etc.)
  const statusLine = document.createElement('div');
  statusLine.className = 'lesson-status';
  statusLine.setAttribute('aria-live', 'polite');
  container.appendChild(statusLine);

  // Glider
  const step = machine.getCurrentStep();
  const glider = createSoundGlider(step.chunks, { onDrop: () => {} }, caseMode);
  container.appendChild(glider.element);

  // Tray
  const tray = createChunkTray(step.tileOptions, {
    onDragStart: (tileIndex) => {
      tray.setDragging(tileIndex, true);
      glider.setActiveSlot(firstEmptySlot());
    },
    onDragEnd: () => {
      glider.setActiveSlot(null);
    },
    onTileClick: (tileIndex) => {
      if (!audioEngine?.isReady() || !machine) return;
      const tileOption = machine.getCurrentStep().tileOptions[tileIndex];
      if (!tileOption) return;
      try {
        audioEngine.stop();
        audioEngine.play(tileOption.chunk.clip);
      } catch {
        // Ignore missing clip
      }
    },
  }, caseMode);
  container.appendChild(tray.element);

  // Advance button
  const advanceButton = document.createElement('button');
  advanceButton.className = 'btn-step';
  advanceButton.style.minWidth = '88px';
  advanceButton.style.minHeight = '88px';
  advanceButton.style.padding = '0.75rem 1.5rem';
  advanceButton.style.fontSize = '1.1rem';
  advanceButton.style.fontWeight = 'bold';
  advanceButton.style.color = 'white';
  advanceButton.style.background = '#4a90d9';
  advanceButton.style.border = 'none';
  advanceButton.style.borderRadius = '12px';
  advanceButton.style.cursor = 'pointer';
  advanceButton.style.touchAction = 'none';
  advanceButton.style.marginTop = '0.5rem';
  container.appendChild(advanceButton);

  // Celebration — decorative confetti burst on step completion.
  const celebration = createCelebration();
  container.appendChild(celebration.element);

  // Skogslingan mascot — friendly forest sprite for encouragement.
  const mascot = createMascot({ pose: 'idle' });
  mascot.element.style.position = 'fixed';
  mascot.element.style.bottom = '16px';
  mascot.element.style.right = '16px';
  mascot.element.style.zIndex = '1000';
  container.appendChild(mascot.element);

  // Drag session — hit-tests the glider on drop.
  const dragSession = createDragSession({
    root: container,
    getDraggable: (el) => {
      if (!el) return null;
      const tile = (el as Element).closest?.('[data-tile-index]') as HTMLElement | null;
      if (!tile || !tray.element.contains(tile)) return null;
      const index = Number(tile.getAttribute('data-tile-index'));
      // Ignore tiles that are no longer available (already dropped).
      if (tile.classList.contains('unavailable')) return null;
      return Number.isNaN(index) ? null : index;
    },
    onDrop: (tileIndex, x, y) => {
      handleDrop(tileIndex, x, y);
    },
  });

  function firstEmptySlot(): number | null {
    const m = machine as LessonMachine;
    const filled = m.getCurrentStep().filled;
    const idx = filled.findIndex((f) => f.chunk === null);
    return idx === -1 ? null : idx;
  }

  let advancing = false;

  function syncStepUI(): void {
    if (!machine) return;
    const stepState = machine.getCurrentStep();
    const isFinalStep = machine.getStepIndex() === machine.getTotalSteps() - 1;

    wordDisplay.textContent = toDisplayCase(stepState.wordId, caseMode);
    passIndicator.textContent = `Omgång ${stepState.pass} av 2`;
    stepCounter.textContent = `Steg ${stepState.stepIndex + 1} av ${machine.getTotalSteps()}`;
    advanceButton.textContent = isFinalStep ? 'Avsluta →' : 'Nästa ord →';
    advanceButton.disabled = !machine.isStepComplete();
  }

  function handleDrop(tileIndex: number, clientX: number, clientY: number): void {
    if (!machine || advancing) return;

    const slotEl = document.elementFromPoint(clientX, clientY)?.closest('[data-slot-index]');
    if (!slotEl) return;

    const result = machine.dropTile(tileIndex);
    if (result.ok) {
      const droppedOption = machine.getCurrentStep().tileOptions[tileIndex];
      const droppedChunk = droppedOption.chunk;
      // `result.slot` is the glider slot index (fill order), NOT the tray index.
      // With shuffled tiles these differ — marking by tray index would fill the
      // wrong slot.
      glider.markSlotFilled(result.slot, droppedChunk);
      tray.setAvailable(tileIndex, false);

      if (machine.isStepComplete()) {
        // Blended playback of the whole word takes priority — do NOT also fire
        // the individual chunk clip for the last drop.
        onStepComplete();
      } else if (audioEngine?.isReady()) {
        try {
          // Stop any in-flight clip so two chunk plays never overlap.
          audioEngine.stop();
          audioEngine.play(droppedChunk.clip);
        } catch {
          // Clip missing — ignore.
        }
      }
    } else {
      // Wrong tile: shake the tray tile, no audio, no lock.
      const tileEl = tray.element.querySelector<HTMLElement>(`[data-tile-index="${tileIndex}"]`);
      if (tileEl) {
        tileEl.classList.add('shake');
        window.setTimeout(() => tileEl.classList.remove('shake'), 300);
      }
      glider.setActiveSlot(result.expected);
    }
    syncStepUI();
  }

  async function onStepComplete(): Promise<void> {
    if (!machine || !audioEngine || advancing) return;
    advancing = true;

    const stepState = machine.getCurrentStep();
    const completedCount = machine.getStepIndex() + 1; // 1-based
    const isFinalStep = machine.getStepIndex() === machine.getTotalSteps() - 1;

    // Blended playback at slow rate.
    if (audioEngine.isReady()) {
      statusLine.textContent = 'Läser ordet…';
      try {
        audioEngine.stop();
        await playBlended(audioEngine, stepState.chunks, 0.85);
      } catch {
        // Blend failed — continue regardless.
      }
    }

    statusLine.textContent = '';
    advanceButton.disabled = false;

    // Celebrate after the feedback flash (status line cleared, button enabled).
    celebration.trigger({ mascot, pose: 'cheer', phraseKey: 'stepComplete' });

    getLessonBridge().sendProgress({
      stepIndex: completedCount,
      totalSteps: machine.getTotalSteps(),
      accuracy: machine.getStepAccuracy(),
    });

    if (isFinalStep) {
      showCompletion();
    }

    advancing = false;
  }

  function showCompletion(): void {
    if (!machine || !lessonRoot) return;

    const stars = machine.getStars();
    const accuracyPercent = Math.round(machine.getAverageAccuracy() * 100);
    const timeMs = performance.now() - lessonStartTime;

    // Move celebration and mascot to document.body so they survive lessonRoot wipe.
    // Both use fixed positioning and don't require lessonRoot as parent.
    const celebrationEl = celebration.element;
    const mascotEl = mascot.element;
    if (celebrationEl.parentNode) {
      celebrationEl.parentNode.removeChild(celebrationEl);
    }
    if (mascotEl.parentNode) {
      mascotEl.parentNode.removeChild(mascotEl);
    }
    document.body.appendChild(celebrationEl);
    document.body.appendChild(mascotEl);

    // Final celebration with mascot — now visible on top of completion screen.
    celebration.trigger({ mascot, pose: 'celebrate', phraseKey: 'celebrate' });

    lessonRoot.innerHTML = '';
    const screen = createCompletionScreen({
      stars,
      accuracyPercent,
      timeMs,
      onBackToHub: () => {
        try {
          window.parent.postMessage(createReturnMessage(), HUB_ORIGIN);
        } catch {
          // Standalone or cross-origin guard — stay on the screen.
        }
      },
    });
    lessonRoot.appendChild(screen.element);

    getLessonBridge().sendComplete({
      stars,
      completionTimeMs: Math.round(performance.now() - lessonStartTime),
      summary: `Du läste alla 8 ord! ${stars} av 3 stjärnor.`,
    });
  }

  advanceButton.addEventListener('click', () => {
    if (!machine || advancing) return;
    const advanced = machine.nextStep();
    if (!advanced) {
      // Should not happen — completion is shown at final step completion.
      return;
    }
    const newStep = machine.getCurrentStep();
    wordDisplay.textContent = toDisplayCase(newStep.wordId, caseMode);
    passIndicator.textContent = `Omgång ${newStep.pass} av 2`;
    stepCounter.textContent = `Steg ${newStep.stepIndex + 1} av ${machine.getTotalSteps()}`;
    statusLine.textContent = '';
    glider.renderStep(newStep.chunks);
    rebuildTray(newStep.tileOptions);
    syncStepUI();
  });

  function rebuildTray(tileOptions: TileOption[]): void {
    // Replace the tray in place using ChunkTray's update method
    tray.update(tileOptions);
  }

  // Initial sync.
  syncStepUI();

  // Register this step's cleanup for lesson-wide cleanup.
  wireCleanup(() => {
    dragSession.destroy();
    tray.destroy();
    glider.destroy();
    celebration.destroy();
    mascot.destroy();
  });
}

/**
 * Wire idempotent cleanup: engine destroy, DOM component destroy, bridge destroy.
 */
let pendingComponentCleanups: Array<() => void> = [];

function wireCleanup(componentCleanup: () => void): void {
  pendingComponentCleanups.push(componentCleanup);

  if (cleanupWired) return;
  cleanupWired = true;

  window.addEventListener('pagehide', cleanupLesson);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    cleanupLesson();
  }
}

/**
 * Idempotent lesson cleanup. Safe to call multiple times.
 */
export function cleanupLesson(): void {
  if (lessonDestroyed) return;
  lessonDestroyed = true;

  for (const cleanup of pendingComponentCleanups) {
    try {
      cleanup();
    } catch {
      // Ignore individual component failures.
    }
  }
  pendingComponentCleanups = [];

  audioEngine?.destroy();
  audioEngine = null;
  machine = null;
  lessonRoot = null;

  window.removeEventListener('pagehide', cleanupLesson);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  destroyLessonBridge();
}