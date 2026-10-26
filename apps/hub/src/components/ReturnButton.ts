/**
 * Props for ReturnButton component.
 */
export interface ReturnButtonProps {
  onClick: () => void;
  visible?: boolean;
}

/**
 * Render a return button to go back to the lesson grid.
 * Touch target ≥88×88px.
 */
export function renderReturnButton(props: ReturnButtonProps): HTMLElement {
  const { onClick, visible = true } = props;

  const button = document.createElement('button');
  button.className = 'return-button';
  button.setAttribute('aria-label', 'Tillbaka till översikt');
  button.setAttribute('title', 'Tillbaka till översikt');
  button.style.display = visible ? 'flex' : 'none';

  const icon = document.createElement('span');
  icon.className = 'return-button__icon';
  icon.textContent = '←';

  const label = document.createElement('span');
  label.className = 'return-button__label';
  label.textContent = 'Tillbaka';

  button.appendChild(icon);
  button.appendChild(label);

  button.addEventListener('click', onClick);

  // Expose show/hide methods
  const extendedButton = button as unknown as HTMLElement & { show: () => void; hide: () => void };
  extendedButton.show = () => {
    button.style.display = 'flex';
  };
  extendedButton.hide = () => {
    button.style.display = 'none';
  };

  return extendedButton;
}

/**
 * Update return button visibility.
 */
export function updateReturnButton(
  button: HTMLElement & { show: () => void; hide: () => void },
  visible: boolean
): void {
  visible ? button.show() : button.hide();
}