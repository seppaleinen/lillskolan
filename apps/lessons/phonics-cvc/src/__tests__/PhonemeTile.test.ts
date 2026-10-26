import { describe, it, expect } from 'vitest';
import { createPhonemeTile } from '../components/PhonemeTile';

describe('PhonemeTile', () => {
  it('creates a button element', () => {
    const onPlay = (clipId: string): void => { };
    const button = createPhonemeTile('k', 'c0', onPlay);
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.textContent).toBe('k');
  });

  it('calls onPlay on tap', async () => {
    const calls: string[] = [];
    const onPlay = (clipId: string): void => { calls.push(clipId); };
    const button = createPhonemeTile('k', 'c0', onPlay);
    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toEqual(['c0']);
  });

  it('has minimum touch target styles', () => {
    const onPlay = (clipId: string): void => { };
    const button = createPhonemeTile('k', 'c0', onPlay);
    expect(button.style.minWidth).toBe('80px');
    expect(button.style.minHeight).toBe('80px');
  });
});