import type { LessonConfig, LessonProgress } from '../types';

/**
 * Props for LessonCard component.
 */
export interface LessonCardProps {
  lesson: LessonConfig;
  progress: LessonProgress | undefined;
  onClick: () => void;
}

/**
 * Render a lesson card for the grid.
 * Touch target ≥88×88px, kid-friendly styling.
 */
export function renderLessonCard(props: LessonCardProps): HTMLElement {
  const { lesson, progress, onClick } = props;
  const stars = progress?.stars ?? 0;
  const completed = progress?.completionCount ?? 0;

  const card = document.createElement('article');
  card.className = 'lesson-card';
  card.style.setProperty('--accent-color', lesson.accentColor);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${lesson.name}, ${stars} stjärnor, ${completed} ord klara`);

  // Icon
  const icon = document.createElement('div');
  icon.className = 'lesson-card__icon';
  icon.textContent = lesson.icon ?? '📚';
  card.appendChild(icon);

  // Title
  const title = document.createElement('h2');
  title.className = 'lesson-card__title';
  title.textContent = lesson.name;
  card.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.className = 'lesson-card__description';
  desc.textContent = lesson.description;
  card.appendChild(desc);

  // Progress indicator
  if (progress && progress.completionCount > 0) {
    const progressEl = document.createElement('div');
    progressEl.className = 'lesson-card__progress';
    progressEl.textContent = `${completed} av ${lesson.estimatedSteps ?? '?'} ord klara`;
    card.appendChild(progressEl);
  }

  // Stars display
  const starsEl = document.createElement('div');
  starsEl.className = 'lesson-card__stars';
  starsEl.setAttribute('aria-label', `${stars} av 3 stjärnor`);
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = i < stars ? 'star filled' : 'star';
    star.textContent = '★';
    starsEl.appendChild(star);
  }
  card.appendChild(starsEl);

  // Click handler
  card.addEventListener('click', onClick);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });

  return card;
}