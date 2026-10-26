import type { ProgressState, LessonProgress, WordProgress } from './types';

const STORAGE_KEY = 'lillskolan.progress.v1';
const SCHEMA_VERSION = 1;

/**
 * Default empty progress state.
 */
export function createEmptyProgress(): ProgressState {
  return {};
}

/**
 * Load progress from localStorage.
 * Returns empty state if not found or corrupted.
 */
export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') {
    return createEmptyProgress();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyProgress();
    }

    const parsed = JSON.parse(raw);

    // Version check for future migrations
    if (parsed.version !== SCHEMA_VERSION) {
      console.warn(
        `[storage] Schema version mismatch (expected ${SCHEMA_VERSION}, got ${parsed.version}). Resetting.`
      );
      return createEmptyProgress();
    }

    return parsed.progress ?? createEmptyProgress();
  } catch (error) {
    console.error('[storage] Failed to load progress:', error);
    return createEmptyProgress();
  }
}

/**
 * Save progress to localStorage.
 */
export function saveProgress(progress: ProgressState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload = {
      version: SCHEMA_VERSION,
      progress,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('[storage] Failed to save progress:', error);
  }
}

/**
 * Update progress for a specific lesson.
 * Handles normalization of accuracy (0-100 → 0-1) and star aggregation.
 */
export function updateLessonProgress(
  progress: ProgressState,
  lessonId: string,
  updates: Partial<LessonProgress> & { wordProgress?: WordProgress }
): ProgressState {
  const existing = progress[lessonId] ?? createEmptyLessonProgress(lessonId);
  const next = { ...existing, ...updates };

  // Handle word-level progress if provided
  if (updates.wordProgress) {
    const wordKey = updates.wordProgress.word;
    const existingWord = next.completedWords[wordKey] ?? createEmptyWordProgress(wordKey);

    // Update word progress with max stars, best accuracy, increment attempts
    next.completedWords = {
      ...next.completedWords,
      [wordKey]: {
        ...existingWord,
        ...updates.wordProgress,
        stars: Math.max(existingWord.stars, updates.wordProgress.stars),
        bestAccuracy: Math.max(existingWord.bestAccuracy, updates.wordProgress.bestAccuracy),
        attempts: existingWord.attempts + 1,
      },
    };

    // Recalculate lesson-level aggregates
    next.stars = calculateLessonStars(next.completedWords);
    next.bestAccuracy = calculateBestAccuracy(next.completedWords);
    next.completionCount = calculateCompletionCount(next.completedWords);
  }

  next.lastPlayedAt = Date.now();

  return {
    ...progress,
    [lessonId]: next,
  };
}

/**
 * Create empty lesson progress.
 */
function createEmptyLessonProgress(lessonId: string): LessonProgress {
  return {
    lessonId,
    stars: 0,
    completedWords: {},
    bestAccuracy: 0,
    completionCount: 0,
    lastPlayedAt: 0,
  };
}

/**
 * Create empty word progress.
 */
function createEmptyWordProgress(word: string): WordProgress {
  return {
    word,
    completed: false,
    stars: 0,
    bestAccuracy: 0,
    attempts: 0,
    lastPlayedAt: 0,
  };
}

/**
 * Calculate overall lesson stars from word progress.
 * Uses the average of word stars, rounded.
 */
function calculateLessonStars(completedWords: Record<string, WordProgress>): number {
  const words = Object.values(completedWords);
  if (words.length === 0) return 0;

  const totalStars = words.reduce((sum, w) => sum + w.stars, 0);
  return Math.round(totalStars / words.length);
}

/**
 * Calculate best accuracy across all words.
 */
function calculateBestAccuracy(completedWords: Record<string, WordProgress>): number {
  const words = Object.values(completedWords);
  if (words.length === 0) return 0;

  return Math.max(...words.map((w) => w.bestAccuracy));
}

/**
 * Calculate how many words have been completed (stars > 0).
 */
function calculateCompletionCount(completedWords: Record<string, WordProgress>): number {
  return Object.values(completedWords).filter((w) => w.stars > 0).length;
}

/**
 * Normalize accuracy to 0-1 range.
 * Input may be 0-1 or 0-100.
 */
export function normalizeAccuracy(accuracy: number): number {
  if (accuracy > 1) {
    return Math.min(1, accuracy / 100);
  }
  return Math.max(0, Math.min(1, accuracy));
}