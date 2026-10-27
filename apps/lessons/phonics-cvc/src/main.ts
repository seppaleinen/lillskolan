import { getLessonBridge } from './bridge';
import { renderLesson } from './lesson';

const app = document.getElementById('app');
if (app) {
  // Initialize lesson bridge (singleton, no-op in standalone mode).
  getLessonBridge();
  // Render the lesson page.
  renderLesson(app);
}