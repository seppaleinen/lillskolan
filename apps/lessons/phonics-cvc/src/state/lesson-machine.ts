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
}

export type DropResult = { ok: true } | { ok: false; expected: number; got: number };

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

export function createLessonMachine(manifest: PhonemeManifest): LessonMachine {
  const totalSteps = manifest.words.length * 2; // 16

  function chunksForStep(stepIndex: number): PhonemeChunk[] {
    const word = manifest.words[stepIndex % manifest.words.length];
    const pass = Math.floor(stepIndex / manifest.words.length) + 1; // 1 or 2
    return word.passes[pass - 1].chunks;
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
      if (tileIndex === emptyIdx) {
        const chunk = chunksForStep(stepIndex)[tileIndex];
        filled[emptyIdx] = { chunk, correct: true };
        correctDrops++;
        return { ok: true };
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