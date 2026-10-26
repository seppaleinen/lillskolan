/**
 * Props for ProgressBar component.
 */
export interface ProgressBarProps {
  stepIndex?: number;
  totalSteps?: number;
  accuracy?: number;
}

/**
 * Render a progress bar showing lesson completion.
 * Displays step progress and accuracy.
 */
export function renderProgressBar(props: ProgressBarProps = {}): HTMLElement {
  const container = document.createElement('div');
  container.className = 'progress-bar';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-label', 'Lektionsprogress');

  const barContainer = document.createElement('div');
  barContainer.className = 'progress-bar__track';

  const bar = document.createElement('div');
  bar.className = 'progress-bar__fill';
  barContainer.appendChild(bar);

  const labelContainer = document.createElement('div');
  labelContainer.className = 'progress-bar__labels';

  const stepLabel = document.createElement('span');
  stepLabel.className = 'progress-bar__label';
  stepLabel.textContent = 'Studerar...';

  const accuracyLabel = document.createElement('span');
  accuracyLabel.className = 'progress-bar__accuracy';
  accuracyLabel.textContent = '';

  labelContainer.appendChild(stepLabel);
  labelContainer.appendChild(accuracyLabel);

  container.appendChild(barContainer);
  container.appendChild(labelContainer);

  // Update function
  const update = (updates: Partial<ProgressBarProps>) => {
    const { stepIndex, totalSteps, accuracy } = { ...props, ...updates };

    let percent = 0;
    if (stepIndex !== undefined && totalSteps && totalSteps > 0) {
      percent = Math.min(100, Math.max(0, (stepIndex / totalSteps) * 100));
      bar.style.width = `${percent}%`;
      stepLabel.textContent = `Steg ${stepIndex} av ${totalSteps}`;
    }

    if (accuracy !== undefined) {
      const accuracyPercent = Math.round(accuracy * 100);
      accuracyLabel.textContent = `${accuracyPercent}% korrekt`;
      accuracyLabel.setAttribute('aria-label', `Noggrannhet ${accuracyPercent} procent`);
    }
  };

  // Initial update
  update(props);

  // Expose update method
  (container as unknown as HTMLElement & { update: (updates: Partial<ProgressBarProps>) => void }).update = update;

  return container;
}

/**
 * Update an existing progress bar.
 */
export function updateProgressBar(
  progressBar: HTMLElement & { update: (updates: Partial<ProgressBarProps>) => void },
  updates: Partial<ProgressBarProps>
): void {
  progressBar.update(updates);
}