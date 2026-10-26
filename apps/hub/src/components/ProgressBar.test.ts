import { describe, it, expect } from 'vitest';
import { renderProgressBar, updateProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with default values', () => {
    const bar = renderProgressBar();
    expect(bar.classList.contains('progress-bar')).toBe(true);
    expect(bar.querySelector('.progress-bar__fill')).toBeTruthy();
    expect(bar.querySelector('.progress-bar__label')).toBeTruthy();
  });

  it('updates progress correctly', () => {
    const bar = renderProgressBar();
    updateProgressBar(bar as any, { stepIndex: 3, totalSteps: 10, accuracy: 0.8 });
    const fill = bar.querySelector('.progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('30%');
    const label = bar.querySelector('.progress-bar__label') as HTMLElement;
    expect(label.textContent).toContain('Steg 3 av 10');
    const accuracyLabel = bar.querySelector('.progress-bar__accuracy') as HTMLElement;
    expect(accuracyLabel.textContent).toContain('80%');
  });

  it('handles edge cases', () => {
    const bar = renderProgressBar();
    updateProgressBar(bar as any, { stepIndex: 0, totalSteps: 5, accuracy: 0 });
    const fill = bar.querySelector('.progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    const accuracyLabel = bar.querySelector('.progress-bar__accuracy') as HTMLElement;
    expect(accuracyLabel.textContent).toContain('0%');
  });
});
