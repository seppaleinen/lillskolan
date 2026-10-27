import { describe, it, expect } from 'vitest';
import { createReturnMessage, LESSON_RETURN } from './return-protocol';

describe('return-protocol (lesson)', () => {
  it('LESSON_RETURN is the expected constant', () => {
    expect(LESSON_RETURN).toBe('LESSON_RETURN');
  });

  it('createReturnMessage returns the expected shape', () => {
    const msg = createReturnMessage();
    expect(msg.type).toBe('LESSON_RETURN');
    expect(msg.source).toBe('lesson');
    expect(typeof msg.timestamp).toBe('number');
    expect(msg.timestamp).toBeGreaterThan(0);
  });
});