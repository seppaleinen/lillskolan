import { describe, it, expect, vi } from 'vitest';
import { createReturnHandler, LESSON_RETURN } from './return-protocol';

function dispatchMessage(origin: string, data: unknown): void {
  const event = new MessageEvent('message', { origin, data });
  window.dispatchEvent(event);
}

describe('createReturnHandler (hub)', () => {
  it('fires onReturn for matching origin and type', () => {
    const onReturn = vi.fn();
    const handler = createReturnHandler('http://example.com', onReturn);
    handler.attach();

    dispatchMessage('http://example.com', { type: LESSON_RETURN });
    expect(onReturn).toHaveBeenCalledTimes(1);

    handler.detach();
  });

  it('ignores messages from wrong origin', () => {
    const onReturn = vi.fn();
    const handler = createReturnHandler('http://example.com', onReturn);
    handler.attach();

    dispatchMessage('http://evil.com', { type: LESSON_RETURN });
    expect(onReturn).not.toHaveBeenCalled();

    handler.detach();
  });

  it('ignores messages with wrong type', () => {
    const onReturn = vi.fn();
    const handler = createReturnHandler('http://example.com', onReturn);
    handler.attach();

    dispatchMessage('http://example.com', { type: 'SOMETHING_ELSE' });
    expect(onReturn).not.toHaveBeenCalled();

    handler.detach();
  });

  it('ignores messages with no data', () => {
    const onReturn = vi.fn();
    const handler = createReturnHandler('http://example.com', onReturn);
    handler.attach();

    dispatchMessage('http://example.com', null);
    expect(onReturn).not.toHaveBeenCalled();

    handler.detach();
  });

  it('detach() stops further calls', () => {
    const onReturn = vi.fn();
    const handler = createReturnHandler('http://example.com', onReturn);
    handler.attach();

    dispatchMessage('http://example.com', { type: LESSON_RETURN });
    expect(onReturn).toHaveBeenCalledTimes(1);

    handler.detach();
    dispatchMessage('http://example.com', { type: LESSON_RETURN });
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});