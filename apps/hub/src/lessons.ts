import { LESSON_ORIGIN } from './config';
import type { LessonConfig } from './types';

/**
 * Lesson registry — single source of truth for available lessons.
 * Adding a new lesson = one entry here.
 */
export const lessons: LessonConfig[] = [
  {
    id: 'phonics-cvc',
    name: 'Fonetik CVC',
    description: 'Lär dig läsa enkla ord med konsonant-vokal-konsonant',
    origin: LESSON_ORIGIN,
    entry: import.meta.env.VITE_LESSON_ENTRY || '/',
    accentColor: '#4A90D9',
    icon: '📖',
    estimatedSteps: 8,
  },
];

/**
 * Get a lesson by its ID.
 */
export function getLesson(id: string): LessonConfig | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

/**
 * Get all available lessons.
 */
export function getAllLessons(): LessonConfig[] {
  return [...lessons];
}

/**
 * Build the full iframe URL for a lesson.
 */
export function getLessonUrl(lesson: LessonConfig): string {
  return new URL(lesson.entry, lesson.origin).href;
}