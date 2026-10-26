import { getAllLessons } from '../lessons';
import type { LessonProgress, ProgressState } from '../types';
import { renderLessonCard } from './LessonCard';

/**
 * Props for LessonGrid component.
 */
export interface LessonGridProps {
  progress: ProgressState;
  onLessonSelect: (lessonId: string) => void;
}

/**
 * Render the lesson grid with all available lessons.
 */
export function renderLessonGrid(props: LessonGridProps): HTMLElement {
  const { progress, onLessonSelect } = props;
  const lessons = getAllLessons();

  const grid = document.createElement('section');
  grid.className = 'lesson-grid';
  grid.setAttribute('aria-label', 'Tillgängliga lektioner');

  lessons.forEach((lesson) => {
    const lessonProgress = progress[lesson.id];
    const card = renderLessonCard({
      lesson,
      progress: lessonProgress,
      onClick: () => onLessonSelect(lesson.id),
    });
    grid.appendChild(card);
  });

  return grid;
}

/**
 * Update the lesson grid in place (for progress updates).
 */
export function updateLessonGrid(
  grid: HTMLElement,
  progress: ProgressState
): void {
  const lessons = getAllLessons();

  // Update each card's progress display
  lessons.forEach((lesson) => {
    const card = grid.querySelector<HTMLElement>(
      `[aria-label*="${lesson.name}"]`
    );
    if (!card) return;

    const lessonProgress = progress[lesson.id];
    if (!lessonProgress) return;

    // Update progress text
    const progressEl = card.querySelector('.lesson-card__progress');
    if (progressEl) {
      progressEl.textContent = `${lessonProgress.completionCount} av ${lesson.estimatedSteps ?? '?'} ord klara`;
    }

    // Update stars
    const starsEl = card.querySelector('.lesson-card__stars');
    if (starsEl) {
      starsEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const star = document.createElement('span');
        star.className = i < lessonProgress.stars ? 'star filled' : 'star';
        star.textContent = '★';
        starsEl.appendChild(star);
      }
      starsEl.setAttribute('aria-label', `${lessonProgress.stars} av 3 stjärnor`);
    }

    // Update aria-label
    card.setAttribute(
      'aria-label',
      `${lesson.name}, ${lessonProgress.stars} stjärnor, ${lessonProgress.completionCount} ord klara`
    );
  });
}