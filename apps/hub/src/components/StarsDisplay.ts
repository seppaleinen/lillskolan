/**
 * Render a stars display showing earned stars (0-3).
 * Used for completion celebration.
 */
export function renderStarsDisplay(stars: number = 0): HTMLElement {
  const container = document.createElement('div');
  container.className = 'stars-display';
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', `${stars} av 3 stjärnor`);

  const starsWrapper = document.createElement('div');
  starsWrapper.className = 'stars-display__wrapper';

  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `star ${i < stars ? 'filled' : 'empty'}`;
    star.textContent = '★';
    starsWrapper.appendChild(star);
  }

  const label = document.createElement('div');
  label.className = 'stars-display__label';
  label.textContent = stars === 0 ? 'Inga stjärnor än' : stars === 1 ? 'Bra jobbat!' : stars === 2 ? 'Mycket bra!' : 'Fantastiskt!';

  container.appendChild(starsWrapper);
  container.appendChild(label);

  return container;
}

/**
 * Update stars display in place.
 */
export function updateStarsDisplay(container: HTMLElement, stars: number): void {
  container.setAttribute('aria-label', `${stars} av 3 stjärnor`);

  const starsWrapper = container.querySelector('.stars-display__wrapper');
  if (!starsWrapper) return;

  starsWrapper.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `star ${i < stars ? 'filled' : 'empty'}`;
    star.textContent = '★';
    starsWrapper.appendChild(star);
  }

  const label = container.querySelector('.stars-display__label');
  if (label) {
    label.textContent = stars === 0 ? 'Inga stjärnor än' : stars === 1 ? 'Bra jobbat!' : stars === 2 ? 'Mycket bra!' : 'Fantastiskt!';
  }
}