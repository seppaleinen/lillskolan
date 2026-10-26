import { describe, it, expect } from 'vitest';
import { LESSON_EVENTS } from './index';

describe('lesson-sdk', () => {
  it('should export correct events', () => {
    expect(LESSON_EVENTS).toEqual(["LESSON_PROGRESS", "LESSON_COMPLETE"]);
  });
});