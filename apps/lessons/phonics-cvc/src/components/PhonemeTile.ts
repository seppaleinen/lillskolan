/**
 * Phoneme tile component - a button with phoneme text.
 * Visual feedback on tap (scale transform). Min touch target 80x80px.
 */

export function createPhonemeTile(text: string, clipId: string, onPlay: (clipId: string) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.minWidth = '80px';
  button.style.minHeight = '80px';
  button.style.fontFamily = 'system-ui, sans-serif';
  button.style.margin = '0.3rem';
  button.style.padding = '0.5rem';
  button.style.background = 'white';
  button.style.border = '2px solid #4a90e2';
  button.style.borderRadius = '8px';
  button.style.cursor = 'pointer';
  button.style.touchAction = 'none';
  // Visual feedback: scale down on press
  const shrink = () => { button.style.transform = 'scale(0.95)'; };
  const grow = () => { button.style.transform = ''; };
  button.addEventListener('mousedown', shrink);
  button.addEventListener('mouseup', grow);
  button.addEventListener('mouseleave', grow);
  button.addEventListener('touchstart', shrink, { passive: false });
  button.addEventListener('touchend', grow, { passive: false });

  // Click/tap handler
  const handlePlay = () => {
    onPlay(clipId);
  };

  button.addEventListener('click', handlePlay);
  button.addEventListener('touchend', (e) => {
    e.preventDefault();
    handlePlay();
  }, { passive: false });

  return button;
}