/**
 * Tap-to-start overlay component.
 * Creates a full-screen overlay with "Tryck för att starta" button.
 * On first tap: calls callback, removes overlay from DOM.
 */

export function createTapToStartGate(onStart: () => void): { element: HTMLElement, remove: () => void } {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(255, 255, 255, 0.9)';
  overlay.style.zIndex = '1000';
  overlay.style.backdropFilter = 'blur(2px)';

  const button = document.createElement('button');
  button.textContent = 'Tryck för att starta';
  button.style.minWidth = '120px';
  button.style.minHeight = '120px';
  button.style.fontSize = '1.2rem';
  button.style.padding = '1rem 1.5rem';
  button.style.fontFamily = 'system-ui, sans-serif';
  button.style.cursor = 'pointer';
  button.style.touchAction = 'none';
  button.style.border = 'none';
  button.style.background = '#4a90e2';
  button.style.color = 'white';
  button.style.borderRadius = '50%';
  button.style.fontWeight = 'bold';

  let hasStarted = false;

  const handleTap = async (): Promise<void> => {
    if (hasStarted) return;
    hasStarted = true;
    await onStart();
    overlay.remove();
  };

  // Click and touch handlers
  button.addEventListener('click', handleTap);
  button.addEventListener('touchstart', handleTap, { passive: false });

  overlay.appendChild(button);
  return { element: overlay, remove: () => overlay.remove() };
}