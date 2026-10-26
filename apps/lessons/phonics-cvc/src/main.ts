import { LessonBridge } from '@lillskolan/lesson-sdk';
import { HUB_ORIGIN } from './config';
import { renderLesson } from './lesson';

const app = document.getElementById('app');
if (app) {
  // Initialize lesson bridge (no-op in standalone mode)
  new LessonBridge({ targetOrigin: HUB_ORIGIN });
  // Render the lesson page
  renderLesson(app);
}