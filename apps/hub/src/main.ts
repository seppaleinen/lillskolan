import './styles.css';
import type { HubState } from './types';
import { loadProgress, saveProgress } from './storage';
import { getLesson, getLessonUrl } from './lessons';
import { renderLessonGrid, updateLessonGrid } from './components/LessonGrid';
import { renderLessonView, cleanupLessonView } from './components/LessonView';

/**
 * HubApp — state machine for managing the hub UI.
 * Handles navigation between grid and lesson views, progress persistence.
 */
class HubApp {
  private state: HubState;
  private container: HTMLElement;
  private currentView: HTMLElement | null = null;
  private currentLessonView: HTMLElement & { cleanup?: () => void } | null = null;

  constructor() {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('App container not found');
    }
    this.container = container;

    this.state = {
      view: 'grid',
      activeLessonId: null,
      progress: loadProgress(),
    };

    this.init();
  }

  private init(): void {
    this.renderHeader();
    this.renderView();
  }

  private renderHeader(): void {
    const header = document.createElement('header');
    header.className = 'hub-header';

    const title = document.createElement('h1');
    title.textContent = 'Lillskolan';

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Välj en lektion för att börja öva';

    header.appendChild(title);
    header.appendChild(subtitle);

    this.container.appendChild(header);
  }

  private renderView(): void {
    // Clear previous view
    if (this.currentView) {
      this.container.removeChild(this.currentView);
      this.currentView = null;
    }

    if (this.state.view === 'grid') {
      this.renderGrid();
    } else if (this.state.view === 'lesson' && this.state.activeLessonId) {
      this.renderLesson();
    }
  }

  private renderGrid(): void {
    const grid = renderLessonGrid({
      progress: this.state.progress,
      onLessonSelect: (lessonId) => this.selectLesson(lessonId),
    });

    this.container.appendChild(grid);
    this.currentView = grid;
  }

  private renderLesson(): void {
    if (!this.state.activeLessonId) return;

    const lesson = getLesson(this.state.activeLessonId);
    if (!lesson) {
      console.error(`[HubApp] Lesson not found: ${this.state.activeLessonId}`);
      this.returnToGrid();
      return;
    }

    const view = renderLessonView({
      lesson,
      progress: this.state.progress,
      onProgress: (lessonId, updates) => this.handleProgressUpdate(lessonId, updates),
      onReturn: () => this.returnToGrid(),
    });

    // Remove grid header and content
    const header = this.container.querySelector('.hub-header');
    if (header) {
      this.container.removeChild(header);
    }

    // Remove existing grid
    const grid = this.container.querySelector('.lesson-grid');
    if (grid) {
      this.container.removeChild(grid);
    }

    this.container.appendChild(view);
    this.currentView = view;
    this.currentLessonView = view;
  }

  private selectLesson(lessonId: string): void {
    const lesson = getLesson(lessonId);
    if (!lesson) {
      console.error(`[HubApp] Unknown lesson: ${lessonId}`);
      return;
    }

    this.state = {
      ...this.state,
      view: 'lesson',
      activeLessonId: lessonId,
    };

    this.renderView();
  }

  private returnToGrid(): void {
    // Clean up lesson view
    if (this.currentLessonView) {
      cleanupLessonView(this.currentLessonView);
      this.currentLessonView = null;
    }

    this.state = {
      ...this.state,
      view: 'grid',
      activeLessonId: null,
    };

    // Re-render header and grid
    this.renderHeader();
    this.renderView();
  }

  private handleProgressUpdate(
    lessonId: string,
    updates: Partial<HubState['progress'][string]>
  ): void {
    this.state.progress = {
      ...this.state.progress,
      [lessonId]: {
        ...this.state.progress[lessonId],
        ...updates,
        lessonId,
        lastPlayedAt: Date.now(),
      },
    };

    // Persist to localStorage
    saveProgress(this.state.progress);

    // Update grid view in place if we're on grid
    if (this.state.view === 'grid' && this.currentView) {
      updateLessonGrid(this.currentView, this.state.progress);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HubApp();
  });
} else {
  new HubApp();
}