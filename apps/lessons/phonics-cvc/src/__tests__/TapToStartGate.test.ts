import { describe, it, expect } from 'vitest';
import { createTapToStartGate } from '../components/TapToStartGate';

describe('TapToStartGate', () => {
  it('calls onStart on tap', async () => {
    let onStartCalled = false;
    const onStart = () => { onStartCalled = true; };
    const { element } = createTapToStartGate(onStart);
    const button = element.querySelector('button')!;
    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onStartCalled).toBe(true);
  });

  it('element is full-screen overlay', () => {
    const onStart = function() {};
    const { element } = createTapToStartGate(onStart);
    const overlay = element;
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.inset).toBe('0');
    expect(overlay.style.display).toBe('flex');
    expect(overlay.style.alignItems).toBe('center');
    expect(overlay.style.justifyContent).toBe('center');
  });

  it('button has large touch target', () => {
    const onStart = function() {};
    const { element } = createTapToStartGate(onStart);
    const button = element.querySelector('button')!;
    expect(button.style.minWidth).toBe('120px');
    expect(button.style.minHeight).toBe('120px');
  });
});