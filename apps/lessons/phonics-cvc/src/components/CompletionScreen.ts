/**
 * CompletionScreen — shown after the final step is complete.
 *
 * Swedish strings exactly:
 *   heading:   "Grattis! Du klarade lektionen!"
 *   subtitle by stars:
 *     1 → "Bra jobbat!"
 *     2 → "Mycket bra!"
 *     3 → "Fantastiskt!"
 *   lines: "Noggrannhet: X%", "Tid: X min Y sek", "X av 3 stjärnor"
 *   back button: "Tillbaka till översikten" (class `completion-back`, ≥88×88px)
 */

export interface CompletionScreenOptions {
  stars: number;
  accuracyPercent: number;
  timeMs: number;
  onBackToHub: () => void;
}

export interface CompletionScreen {
  element: HTMLElement;
}

const SUBTITLES: Record<number, string> = {
  1: 'Bra jobbat!',
  2: 'Mycket bra!',
  3: 'Fantastiskt!',
};

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min ${sec} sek`;
}

export function createCompletionScreen(opts: CompletionScreenOptions): CompletionScreen {
  const { stars, accuracyPercent, timeMs, onBackToHub } = opts;

  const container = document.createElement('div');
  container.className = 'completion-screen';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.background = 'linear-gradient(135deg, #fef9e7 0%, #fdebd0 100%)';
  container.style.zIndex = '2000';
  container.style.padding = '1rem';
  container.style.textAlign = 'center';

  const heading = document.createElement('h2');
  heading.className = 'completion-heading';
  heading.textContent = 'Grattis! Du klarade lektionen!';
  heading.style.fontSize = '2rem';
  heading.style.color = '#27ae60';
  heading.style.marginBottom = '0.5rem';
  container.appendChild(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'completion-subtitle';
  subtitle.textContent = SUBTITLES[stars] ?? 'Bra jobbat!';
  subtitle.style.fontSize = '1.3rem';
  subtitle.style.color = '#555';
  subtitle.style.marginBottom = '1rem';
  container.appendChild(subtitle);

  // Stars display
  const starsRow = document.createElement('div');
  starsRow.className = 'completion-stars';
  starsRow.style.fontSize = '2rem';
  starsRow.style.marginBottom = '1rem';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.textContent = i < stars ? '★' : '☆';
    star.style.color = i < stars ? '#f1c40f' : '#ccc';
    starsRow.appendChild(star);
  }
  const starsLabel = document.createElement('p');
  starsLabel.className = 'completion-stars-label';
  starsLabel.textContent = `${stars} av 3 stjärnor`;
  starsLabel.style.marginTop = '0.25rem';
  starsLabel.style.color = '#666';
  container.appendChild(starsRow);
  container.appendChild(starsLabel);

  // Accuracy
  const accuracyLine = document.createElement('p');
  accuracyLine.className = 'completion-line';
  accuracyLine.textContent = `Noggrannhet: ${accuracyPercent}%`;
  accuracyLine.style.fontSize = '1.1rem';
  accuracyLine.style.color = '#444';
  accuracyLine.style.margin = '0.25rem 0';
  container.appendChild(accuracyLine);

  // Time
  const timeLine = document.createElement('p');
  timeLine.className = 'completion-line';
  timeLine.textContent = `Tid: ${formatTime(timeMs)}`;
  timeLine.style.fontSize = '1.1rem';
  timeLine.style.color = '#444';
  timeLine.style.margin = '0.25rem 0';
  container.appendChild(timeLine);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'completion-back';
  backBtn.textContent = 'Tillbaka till översikten';
  backBtn.style.minWidth = '88px';
  backBtn.style.minHeight = '88px';
  backBtn.style.padding = '0.75rem 1.5rem';
  backBtn.style.fontSize = '1.1rem';
  backBtn.style.fontFamily = 'system-ui, sans-serif';
  backBtn.style.fontWeight = 'bold';
  backBtn.style.color = '#fff';
  backBtn.style.background = '#4a90d9';
  backBtn.style.border = 'none';
  backBtn.style.borderRadius = '12px';
  backBtn.style.cursor = 'pointer';
  backBtn.style.touchAction = 'none';
  backBtn.style.marginTop = '1.5rem';
  backBtn.addEventListener('click', onBackToHub);
  container.appendChild(backBtn);

  return { element: container };
}