import { describe, it, expect } from 'vitest';
import { LESSON_ORIGIN } from './config';

describe('hub config', () => {
  it('should have correct lesson origin', () => {
    expect(LESSON_ORIGIN).toBe("http://localhost:5174");
  });
});
