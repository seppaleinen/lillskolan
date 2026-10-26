import { describe, it, expect } from 'vitest';
import { lessons, getLesson, getAllLessons, getLessonUrl } from './lessons';

describe('lessons', () => {
  it('has phonics-cvc lesson', () => {
    const lesson = getLesson('phonics-cvc');
    expect(lesson).toBeDefined();
    expect(lesson?.id).toBe('phonics-cvc');
    expect(lesson?.name).toBe('Fonetik CVC');
    expect(lesson?.description).toBe('Lär dig läsa enkla ord med konsonant-vokal-konsonant');
  });

  it('lessons array is non-empty', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('all lessons have required fields', () => {
    lessons.forEach(lesson => {
      expect(lesson.id).toBeTypeOf('string');
      expect(lesson.name).toBeTypeOf('string');
      expect(lesson.description).toBeTypeOf('string');
      expect(lesson.origin).toBeTypeOf('string');
      expect(lesson.entry).toBeTypeOf('string');
      expect(lesson.accentColor).toBeTypeOf('string');
    });
  });

  it('lesson IDs are unique', () => {
    const ids = lessons.map(l => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('getLesson returns undefined for unknown lesson', () => {
    expect(getLesson('unknown')).toBeUndefined();
  });

  it('getAllLessons returns copy', () => {
    const all1 = getAllLessons();
    const all2 = getAllLessons();
    expect(all1).not.toBe(all2);
    expect(all1).toEqual(all2);
  });

  it('getLessonUrl builds correct URL', () => {
    const lesson = getLesson('phonics-cvc')!;
    const url = getLessonUrl(lesson);
    expect(url).toBe('http://localhost:5174/');
  });
});
