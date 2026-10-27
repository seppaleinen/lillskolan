import { describe, it, expect } from 'vitest';
import { createLessonMachine } from '../state/lesson-machine';
import type { PhonemeManifest } from '../types/phoneme-manifest';

const manifest: PhonemeManifest = {
  version: '1.0.0',
  words: [
    {
      id: 'bil',
      letters: ['b', 'i', 'l'],
      passes: [
        { chunks: [{ text: 'b', clip: 'b' }, { text: 'il', clip: 'il' }] },
        { chunks: [{ text: 'b', clip: 'b' }, { text: 'i', clip: 'i' }, { text: 'l', clip: 'l' }] },
      ],
    },
    {
      id: 'hus',
      letters: ['h', 'u', 's'],
      passes: [
        { chunks: [{ text: 'h', clip: 'h' }, { text: 'us', clip: 'us' }] },
        { chunks: [{ text: 'h', clip: 'h' }, { text: 'u', clip: 'u' }, { text: 's', clip: 's' }] },
      ],
    },
  ],
  clips: ['b', 'i', 'l', 'il', 'h', 'u', 's', 'us'],
};

describe('createLessonMachine', () => {
  it('has 16 total steps (8 words × 2 passes)', () => {
    const m = createLessonMachine(manifest);
    expect(m.getTotalSteps()).toBe(4);
  });

  it('step ordering is pass-major: steps 0-1 pass 1, steps 2-3 pass 2', () => {
    const m = createLessonMachine(manifest);
    expect(m.getCurrentStep().pass).toBe(1);
    expect(m.getCurrentStep().wordId).toBe('bil');
    expect(m.getCurrentStep().slotCount).toBe(2);

    m.nextStep();
    expect(m.getStepIndex()).toBe(1);
    expect(m.getCurrentStep().pass).toBe(1);
    expect(m.getCurrentStep().wordId).toBe('hus');
    expect(m.getCurrentStep().slotCount).toBe(2);

    m.nextStep();
    expect(m.getStepIndex()).toBe(2);
    expect(m.getCurrentStep().pass).toBe(2);
    expect(m.getCurrentStep().wordId).toBe('bil');
    expect(m.getCurrentStep().slotCount).toBe(3);

    m.nextStep();
    expect(m.getStepIndex()).toBe(3);
    expect(m.getCurrentStep().pass).toBe(2);
    expect(m.getCurrentStep().wordId).toBe('hus');
    expect(m.getCurrentStep().slotCount).toBe(3);
  });

  it('dropTile accepts correct tile in order', () => {
    const m = createLessonMachine(manifest);
    const r0 = m.dropTile(0);
    expect(r0).toEqual({ ok: true });
    expect(m.getCurrentStep().filled[0].chunk).not.toBeNull();
    expect(m.getCurrentStep().filled[0].correct).toBe(true);
    expect(m.getStepAccuracy()).toBe(1);

    const r1 = m.dropTile(1);
    expect(r1).toEqual({ ok: true });
    expect(m.isStepComplete()).toBe(true);
    expect(m.getStepAccuracy()).toBe(1);
  });

  it('dropTile rejects wrong tile', () => {
    const m = createLessonMachine(manifest);
    const r = m.dropTile(1); // first empty slot is 0
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.expected).toBe(0);
      expect(r.got).toBe(1);
    }
    expect(m.getCurrentStep().filled[0].chunk).toBeNull();
    expect(m.getStepAccuracy()).toBe(0);
  });

  it('dropTile rejects tile after slot is filled', () => {
    const m = createLessonMachine(manifest);
    m.dropTile(0);
    const r = m.dropTile(0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.expected).toBe(1);
      expect(r.got).toBe(0);
    }
    expect(m.getStepAccuracy()).toBe(0.5); // 1 correct, 1 incorrect
  });

  it('accuracy math: 0 attempts → 0', () => {
    const m = createLessonMachine(manifest);
    expect(m.getStepAccuracy()).toBe(0);
  });

  it('average over completed steps', () => {
    const m = createLessonMachine(manifest);
    // Step 0: drop 1 (incorrect, slot 0 empty), drop 0 (correct) → 1 correct, 1 incorrect = 0.5
    m.dropTile(1);
    m.dropTile(0);
    expect(m.isStepComplete()).toBe(false);
    expect(m.getStepAccuracy()).toBe(0.5);

    // Complete step 0: drop 1 (correct, slot 1 empty)
    m.dropTile(1);
    expect(m.isStepComplete()).toBe(true);
    expect(m.getStepAccuracy()).toBeCloseTo(2 / 3, 5);

    m.nextStep(); // step 1
    // Step 1: 2 correct, 0 incorrect → 1.0
    m.dropTile(0);
    m.dropTile(1);
    expect(m.isStepComplete()).toBe(true);
    expect(m.getStepAccuracy()).toBe(1);

    m.nextStep(); // step 2
    expect(m.getAverageAccuracy()).toBeCloseTo((2 / 3 + 1) / 2, 5); // mean of completed steps
  });

  it('nextStep returns false at final step', () => {
    const m = createLessonMachine(manifest);
    // Complete all steps.
    for (let i = 0; i < m.getTotalSteps(); i++) {
      const step = m.getCurrentStep();
      for (let j = 0; j < step.slotCount; j++) {
        m.dropTile(j);
      }
      if (i < m.getTotalSteps() - 1) {
        expect(m.nextStep()).toBe(true);
      } else {
        expect(m.nextStep()).toBe(false);
      }
    }
  });

  it('reset() restores step 0 with empty slots', () => {
    const m = createLessonMachine(manifest);
    m.dropTile(0);
    m.dropTile(1);
    m.nextStep();
    m.reset();
    expect(m.getStepIndex()).toBe(0);
    expect(m.getCurrentStep().wordId).toBe('bil');
    expect(m.isStepComplete()).toBe(false);
    expect(m.getAverageAccuracy()).toBe(0);
  });

  it('getStars() maps average accuracy to 1-3 stars', () => {
    const m = createLessonMachine(manifest);
    // No completions → 0 average → 1 star
    expect(m.getStars()).toBe(1);

    // Complete step 0 with 2/3 accuracy
    m.dropTile(1);
    m.dropTile(0);
    m.dropTile(1);
    m.nextStep();

    // Complete step 1 with 1.0 accuracy → average = (2/3 + 1) / 2 = 0.8333 → 2 stars
    m.dropTile(0);
    m.dropTile(1);
    m.nextStep();

    expect(m.getAverageAccuracy()).toBeCloseTo((2 / 3 + 1) / 2, 5);
    expect(m.getStars()).toBe(2);
  });
});