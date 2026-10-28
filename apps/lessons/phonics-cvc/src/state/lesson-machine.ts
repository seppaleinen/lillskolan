/**
 * Lesson state machine — pure, no DOM/audio/bridge.
 *
 * Step ordering is pass-major:
 *   steps 0–7  → pass 1 (2 slots: onset + rim), words in manifest order
 *   steps 8–15 → pass 2 (3 slots: onset + vowel + coda), same words
 *
 * Total steps = 16 (8 words × 2 passes).
 */

import type { PhonemeChunk, PhonemeManifest } from '../types/phoneme-manifest';
import { computeStars } from '../scoring';

/** Maximum number of tile options shown (correct + distractors) */
const MAX_TILE_OPTIONS = 6;

/** Tile option with distractor flag */
export interface TileOption {
  chunk: PhonemeChunk;
  isDistractor: boolean;
}

export interface StepState {
  stepIndex: number; // 0-based internal
  wordId: string;
  pass: 1 | 2;
  chunks: PhonemeChunk[];
  slotCount: number;
  filled: Array<{ chunk: PhonemeChunk | null; correct: boolean }>;
  correctDrops: number;
  incorrectDrops: number;
  complete: boolean;
  /** Shuffled mix of correct chunks and distractors for this step */
  tileOptions: TileOption[];
}

export type DropResult = { ok: true; slot: number } | { ok: false; expected: number; got: number };

export interface LessonMachine {
  getCurrentStep(): StepState;
  getStepIndex(): number; // 0-based internal
  getTotalSteps(): number; // 16
  getStepAccuracy(): number; // correctDrops / (correctDrops + incorrectDrops), 0 if none
  getAverageAccuracy(): number; // mean over completed steps, 0 if none
  dropTile(tileIndex: number): DropResult;
  isStepComplete(): boolean;
  nextStep(): boolean; // false at final step
  reset(): void;
  getStars(): number; // computeStars(getAverageAccuracy())
}

/**
 * Linear Congruential Generator for deterministic pseudo-random numbers.
 * seeded by wordIndex + passIndex for reproducibility.
 */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Fisher-Yates shuffle with deterministic LCG seeding.
 * Returns a new shuffled array.
 */
function shuffleTiles<T>(items: T[], seed: number): T[] {
  const rand = lcg(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createLessonMachine(manifest: PhonemeManifest): LessonMachine {
  const totalSteps = manifest.words.length * 2; // 16

  function chunksForStep(stepIndex: number): PhonemeChunk[] {
    const word = manifest.words[stepIndex % manifest.words.length];
    const pass = Math.floor(stepIndex / manifest.words.length) + 1; // 1 or 2
    return word.passes[pass - 1].chunks;
  }

  /**
   * Build tile options for a step: correct chunks + distractors, capped at MAX_TILE_OPTIONS.
   * Shuffled deterministically by stepIndex only when distractors are present.
   * Legacy manifests without distractors get tiles in original order (backward compatible).
   */
  function tileOptionsForStep(stepIndex: number): TileOption[] {
    const word = manifest.words[stepIndex % manifest.words.length];
    const pass = Math.floor(stepIndex / manifest.words.length) + 1; // 1 or 2
    const passData = word.passes[pass - 1];

    // Correct chunks (always included, marked as non-distractors)
    const correctOptions: TileOption[] = passData.chunks.map((chunk) => ({
      chunk,
      isDistractor: false,
    }));

    // Distractors (if available)
    const distractors = passData.distractors ?? [];
    const distractorOptions: TileOption[] = distractors.map((chunk) => ({
      chunk: { ...chunk, isDistractor: true },
      isDistractor: true,
    }));

    // Combine: prioritize correct chunks, fill with distractors up to cap
    const allOptions = [...correctOptions, ...distractorOptions];
    const cappedOptions = allOptions.slice(0, MAX_TILE_OPTIONS);

    // Only shuffle when there are distractors to mix in.
    // Legacy manifests (no distractors) get tiles in original order.
    if (distractorOptions.length > 0) {
      return shuffleTiles(cappedOptions, stepIndex);
    }
    return cappedOptions;
  }

  function slotCountFor(stepIndex: number): number {
    return chunksForStep(stepIndex).length;
  }

  function wordIdFor(stepIndex: number): string {
    return manifest.words[stepIndex % manifest.words.length].id;
  }

  function passFor(stepIndex: number): 1 | 2 {
    return (Math.floor(stepIndex / manifest.words.length) + 1) as 1 | 2;
  }

  let stepIndex = 0;
  let filled: Array<{ chunk: PhonemeChunk | null; correct: boolean }> = [];
  let correctDrops = 0;
  let incorrectDrops = 0;
  const completedAccuracies: number[] = [];

  function snapshot(): StepState {
    return {
      stepIndex,
      wordId: wordIdFor(stepIndex),
      pass: passFor(stepIndex),
      chunks: chunksForStep(stepIndex),
      slotCount: slotCountFor(stepIndex),
      filled: filled.map((f) => ({ ...f })),
      correctDrops,
      incorrectDrops,
      complete: filled.every((f) => f.chunk !== null),
      tileOptions: tileOptionsForStep(stepIndex),
    };
  }

  function firstEmptySlotIndex(): number {
    return filled.findIndex((f) => f.chunk === null);
  }

  const machine: LessonMachine = {
    getCurrentStep: () => snapshot(),

    getStepIndex: () => stepIndex,

    getTotalSteps: () => totalSteps,

    getStepAccuracy: () => {
      const total = correctDrops + incorrectDrops;
      if (total === 0) return 0;
      return correctDrops / total;
    },

    getAverageAccuracy: () => {
      if (completedAccuracies.length === 0) return 0;
      const sum = completedAccuracies.reduce((a, b) => a + b, 0);
      return sum / completedAccuracies.length;
    },

    dropTile(tileIndex: number): DropResult {
      const emptyIdx = firstEmptySlotIndex();
      if (emptyIdx === -1) {
        // Step already full — reject silently as incorrect.
        incorrectDrops++;
        return { ok: false, expected: emptyIdx, got: tileIndex };
      }

      const currentTileOptions = tileOptionsForStep(stepIndex);

      // Out of bounds check
      if (tileIndex < 0 || tileIndex >= currentTileOptions.length) {
        incorrectDrops++;
        return { ok: false, expected: emptyIdx, got: tileIndex };
      }

      const droppedOption = currentTileOptions[tileIndex];

      // Always reject distractor tiles
      if (droppedOption.isDistractor) {
        incorrectDrops++;
        return { ok: false, expected: emptyIdx, got: tileIndex };
      }

      // Check if dropped chunk matches the expected chunk for the first empty slot
      const expectedChunk = chunksForStep(stepIndex)[emptyIdx];
      const droppedChunk = droppedOption.chunk;

      // Compare by text and clip for safety
      if (droppedChunk.text === expectedChunk.text && droppedChunk.clip === expectedChunk.clip) {
        filled[emptyIdx] = { chunk: expectedChunk, correct: true };
        correctDrops++;
        return { ok: true, slot: emptyIdx };
      }

      incorrectDrops++;
      return { ok: false, expected: emptyIdx, got: tileIndex };
    },

    isStepComplete: () => filled.every((f) => f.chunk !== null),

    nextStep(): boolean {
      if (machine.isStepComplete()) {
        completedAccuracies.push(machine.getStepAccuracy());
      }
      if (stepIndex >= totalSteps - 1) {
        return false;
      }
      stepIndex++;
      filled = Array.from({ length: slotCountFor(stepIndex) }, () => ({
        chunk: null,
        correct: false,
      }));
      correctDrops = 0;
      incorrectDrops = 0;
      return true;
    },

    reset(): void {
      stepIndex = 0;
      filled = Array.from({ length: slotCountFor(0) }, () => ({
        chunk: null,
        correct: false,
      }));
      correctDrops = 0;
      incorrectDrops = 0;
      completedAccuracies.length = 0;
    },

    getStars: () => computeStars(machine.getAverageAccuracy()),
  };

  // Initialize filled array for step 0.
  filled = Array.from({ length: slotCountFor(0) }, () => ({
    chunk: null,
    correct: false,
  }));

  return machine;
}