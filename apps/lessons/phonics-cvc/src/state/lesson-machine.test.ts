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
    expect(r0).toEqual({ ok: true, slot: 0 });
    expect(m.getCurrentStep().filled[0].chunk).not.toBeNull();
    expect(m.getCurrentStep().filled[0].correct).toBe(true);
    expect(m.getStepAccuracy()).toBe(1);

    const r1 = m.dropTile(1);
    expect(r1).toEqual({ ok: true, slot: 1 });
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

describe('distractors + tileOptions (issue #16)', () => {
  const distractorManifest: PhonemeManifest = {
    version: '1.0.0',
    words: [
      {
        id: 'bil',
        letters: ['b', 'i', 'l'],
        passes: [
          {
            chunks: [{ text: 'b', clip: 'b' }, { text: 'il', clip: 'il' }],
            distractors: [{ text: 't', clip: 't' }, { text: 's', clip: 's' }],
          },
          { chunks: [{ text: 'b', clip: 'b' }, { text: 'i', clip: 'i' }, { text: 'l', clip: 'l' }] },
        ],
      },
    ],
    clips: ['b', 'i', 'l', 'il', 't', 's'],
  };

  it('tileOptions includes correct chunks marked non-distractor', () => {
    const m = createLessonMachine(distractorManifest);
    const opts = m.getCurrentStep().tileOptions;
    const correct = opts.filter((o) => !o.isDistractor);
    // Set comparison — shuffle may reorder correct chunks too.
    expect(correct.map((o) => o.chunk.text).sort()).toEqual(['b', 'il']);
  });

  it('tileOptions includes distractors marked as distractor', () => {
    const m = createLessonMachine(distractorManifest);
    const opts = m.getCurrentStep().tileOptions;
    const distractors = opts.filter((o) => o.isDistractor);
    expect(distractors.map((o) => o.chunk.text)).toEqual(['t', 's']);
  });

  it('tileOptions are shuffled deterministically by stepIndex', () => {
    const a = createLessonMachine(distractorManifest);
    const b = createLessonMachine(distractorManifest);
    const orderA = a.getCurrentStep().tileOptions.map((o) => o.chunk.text);
    const orderB = b.getCurrentStep().tileOptions.map((o) => o.chunk.text);
    expect(orderA).toEqual(orderB); // same seed → same shuffle
    expect(orderA).not.toEqual(['b', 'il', 't', 's']); // shuffle actually mixed them
    expect(orderA.sort()).toEqual(['b', 'il', 's', 't']); // same set, any order
  });

  it('legacy manifest (no distractors) keeps original order, no shuffle', () => {
    const m = createLessonMachine(manifest);
    const opts = m.getCurrentStep().tileOptions;
    expect(opts.map((o) => o.chunk.text)).toEqual(['b', 'il']);
    expect(opts.every((o) => !o.isDistractor)).toBe(true);
  });

  it('distractor tile is always rejected even in an empty slot', () => {
    const m = createLessonMachine(distractorManifest);
    const opts = m.getCurrentStep().tileOptions;
    const distractorIdx = opts.findIndex((o) => o.isDistractor);
    expect(distractorIdx).toBeGreaterThanOrEqual(0);
    const r = m.dropTile(distractorIdx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.expected).toBe(0); // first empty slot
      expect(r.got).toBe(distractorIdx);
    }
    expect(m.getCurrentStep().filled[0].chunk).toBeNull();
    expect(m.getStepAccuracy()).toBe(0);
  });

  it('correct tile is accepted regardless of its tray position after shuffle', () => {
    const m = createLessonMachine(distractorManifest);
    const opts = m.getCurrentStep().tileOptions;
    // Find the tray index of the chunk that belongs in slot 0 ("b").
    const bIdx = opts.findIndex((o) => !o.isDistractor && o.chunk.text === 'b');
    expect(bIdx).not.toBe(0); // shuffled away from position 0
    const r = m.dropTile(bIdx);
    expect(r).toEqual({ ok: true, slot: 0 });
    expect(m.getCurrentStep().filled[0].correct).toBe(true);
  });

  it('dropTile returns the slot index that was filled on success', () => {
    const m = createLessonMachine(distractorManifest);
    const opts = m.getCurrentStep().tileOptions;
    const bIdx = opts.findIndex((o) => !o.isDistractor && o.chunk.text === 'b');
    m.dropTile(bIdx);
    const ilIdx = opts.findIndex((o) => !o.isDistractor && o.chunk.text === 'il');
    const r = m.dropTile(ilIdx);
    expect(r).toEqual({ ok: true, slot: 1 });
  });

  it('caps total tile options at MAX_TILE_OPTIONS (6)', () => {
    const big: PhonemeManifest = {
      version: '1.0.0',
      words: [
        {
          id: 'big',
          letters: ['b', 'i', 'g'],
          passes: [
            {
              chunks: [{ text: 'b', clip: 'b' }, { text: 'ig', clip: 'ig' }],
              distractors: [
                { text: 't', clip: 't' },
                { text: 's', clip: 's' },
                { text: 'd', clip: 'd' },
                { text: 'p', clip: 'p' },
                { text: 'm', clip: 'm' },
                { text: 'k', clip: 'k' },
                { text: 'n', clip: 'n' },
              ],
            },
            { chunks: [{ text: 'b', clip: 'b' }, { text: 'i', clip: 'i' }, { text: 'g', clip: 'g' }] },
          ],
        },
      ],
      clips: ['b', 'i', 'g', 'ig', 't', 's', 'd', 'p', 'm', 'k', 'n'],
    };
    const m = createLessonMachine(big);
    expect(m.getCurrentStep().tileOptions.length).toBeLessThanOrEqual(6);
    // Correct chunks are never dropped by the cap.
    const correct = m.getCurrentStep().tileOptions.filter((o) => !o.isDistractor);
    expect(correct.map((o) => o.chunk.text).sort()).toEqual(['b', 'ig']);
  });
});