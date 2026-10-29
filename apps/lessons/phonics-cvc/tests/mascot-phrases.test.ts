import { describe, it, expect } from 'vitest';
import {
  pickPhrase,
  poseFor,
  MASCOT_PHRASES,
  MASCOT_POSE_MAP,
  type MascotPhraseKey,
  type MascotPose,
} from '../src/utils/mascot';

describe('mascot phrases and poses', () => {
  const phraseKeys: MascotPhraseKey[] = ['stepComplete', 'celebrate', 'thinking', 'encourage'];

  it('exports all phrase keys with non-empty arrays', () => {
    for (const key of phraseKeys) {
      expect(MASCOT_PHRASES[key]).toBeDefined();
      expect(Array.isArray(MASCOT_PHRASES[key])).toBe(true);
      expect(MASCOT_PHRASES[key].length).toBeGreaterThan(0);
      for (const phrase of MASCOT_PHRASES[key]) {
        expect(typeof phrase).toBe('string');
        expect(phrase.length).toBeGreaterThan(0);
      }
    }
  });

  it('pickPhrase returns a phrase from the correct array', () => {
    for (const key of phraseKeys) {
      const phrase = pickPhrase(key);
      expect(MASCOT_PHRASES[key]).toContain(phrase);
    }
  });

  it('pickPhrase returns different phrases on multiple calls (random)', () => {
    const key: MascotPhraseKey = 'stepComplete';
    const phrases = new Set<string>();
    for (let i = 0; i < 20; i++) {
      phrases.add(pickPhrase(key));
    }
    // Should have some variety (at least 2 different phrases from 3 available)
    expect(phrases.size).toBeGreaterThanOrEqual(2);
  });

  it('exports pose mapping for all phrase keys', () => {
    for (const key of phraseKeys) {
      expect(MASCOT_POSE_MAP[key]).toBeDefined();
    }
  });

  it('poseFor returns correct pose for each phrase key', () => {
    expect(poseFor('stepComplete')).toBe('cheer');
    expect(poseFor('celebrate')).toBe('celebrate');
    expect(poseFor('thinking')).toBe('thinking');
    expect(poseFor('encourage')).toBe('idle');
  });

  it('poseFor returns valid MascotPose type', () => {
    for (const key of phraseKeys) {
      const pose = poseFor(key);
      expect(['idle', 'cheer', 'celebrate', 'thinking']).toContain(pose);
    }
  });

  it('all poses are valid MascotPose values', () => {
    const validPoses: MascotPose[] = ['idle', 'cheer', 'celebrate', 'thinking'];
    for (const pose of validPoses) {
      // Just verify they're valid string literals
      expect(typeof pose).toBe('string');
    }
  });
});