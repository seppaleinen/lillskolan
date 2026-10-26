import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadProgress, saveProgress, updateLessonProgress, normalizeAccuracy } from './storage';
import { createEmptyProgress } from './storage';

describe('storage', () => {
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      length: 0,
      key: vi.fn(),
    } as unknown as Storage;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it('loadProgress returns empty state when no data', () => {
    const progress = loadProgress();
    expect(progress).toEqual({});
  });

  it('loadProgress returns empty state on corrupted JSON', () => {
    localStorage.setItem('lillskolan.progress.v1', 'not json');
    const progress = loadProgress();
    expect(progress).toEqual({});
  });

  it('loadProgress rejects wrong schema version', () => {
    const payload = JSON.stringify({ version: 99, progress: { test: {} }, updatedAt: Date.now() });
    localStorage.setItem('lillskolan.progress.v1', payload);
    const progress = loadProgress();
    expect(progress).toEqual({});
  });

  it('saveProgress serializes with version', () => {
    const progress = { 'phonics-cvc': { lessonId: 'phonics-cvc', stars: 3, completedWords: {}, bestAccuracy: 0.9, completionCount: 1, lastPlayedAt: 123 } };
    saveProgress(progress);
    const stored = JSON.parse(localStorage.getItem('lillskolan.progress.v1')!);
    expect(stored.version).toBe(1);
    expect(stored.progress).toEqual(progress);
    expect(stored.updatedAt).toBeTypeOf('number');
  });

  it('updateLessonProgress creates new lesson if not exists', () => {
    const progress = {};
    const updated = updateLessonProgress(progress, 'phonics-cvc', { stars: 2 });
    expect(updated['phonics-cvc']).toBeDefined();
    expect(updated['phonics-cvc'].lessonId).toBe('phonics-cvc');
    expect(updated['phonics-cvc'].stars).toBe(2);
  });

  it('normalizeAccuracy handles 0-1 range', () => {
    expect(normalizeAccuracy(0.85)).toBe(0.85);
    expect(normalizeAccuracy(0.5)).toBe(0.5);
    expect(normalizeAccuracy(1)).toBe(1);
  });

  it('normalizeAccuracy handles 0-100 range', () => {
    expect(normalizeAccuracy(85)).toBe(0.85);
    expect(normalizeAccuracy(100)).toBe(1);
    expect(normalizeAccuracy(50)).toBe(0.5);
  });

  it('normalizeAccuracy clamps values', () => {
    expect(normalizeAccuracy(-0.5)).toBe(0);
    expect(normalizeAccuracy(1.5)).toBe(0.015); // 1.5% = 0.015
    expect(normalizeAccuracy(150)).toBe(1);
  });

  it('updateLessonProgress merges word progress correctly', () => {
    const progress = {};
    const wordProgress = { word: 'kat', completed: true, stars: 2, bestAccuracy: 0.8, attempts: 1, lastPlayedAt: Date.now() };
    const updated = updateLessonProgress(progress, 'phonics-cvc', { wordProgress });
    const lesson = updated['phonics-cvc'];
    expect(lesson.completedWords['kat']).toBeDefined();
    expect(lesson.completedWords['kat'].stars).toBe(2);
    expect(lesson.completedWords['kat'].bestAccuracy).toBe(0.8);
    expect(lesson.stars).toBe(2);
    expect(lesson.bestAccuracy).toBe(0.8);
    expect(lesson.completionCount).toBe(1);
  });

  it('updateLessonProgress keeps max stars for word', () => {
    const existing = {
      'phonics-cvc': {
        lessonId: 'phonics-cvc',
        stars: 1,
        completedWords: {
          'kat': { word: 'kat', completed: true, stars: 1, bestAccuracy: 0.6, attempts: 1, lastPlayedAt: 0 }
        },
        bestAccuracy: 0.6,
        completionCount: 1,
        lastPlayedAt: 0,
      }
    };
    const wordProgress = { word: 'kat', completed: true, stars: 3, bestAccuracy: 0.9, attempts: 1, lastPlayedAt: Date.now() };
    const updated = updateLessonProgress(existing, 'phonics-cvc', { wordProgress });
    expect(updated['phonics-cvc'].completedWords['kat'].stars).toBe(3);
    expect(updated['phonics-cvc'].completedWords['kat'].bestAccuracy).toBe(0.9);
    expect(updated['phonics-cvc'].completedWords['kat'].attempts).toBe(2);
  });
});
