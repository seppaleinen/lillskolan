import type { LessonConfig, ProgressState } from '../types';
import type { LessonProgressPayload, LessonCompletePayload } from '@lillskolan/lesson-sdk';
import { createHubBridge } from '../bridge';
import { normalizeAccuracy } from '../storage';
import { LESSON_ORIGIN } from '../config';
import { createReturnHandler } from '../return-protocol';
import { renderProgressBar, updateProgressBar } from './ProgressBar';
import { renderStarsDisplay, updateStarsDisplay } from './StarsDisplay';
import { renderReturnButton, updateReturnButton } from './ReturnButton';

/**
 * Props for LessonView component.
 */
export interface LessonViewProps {
  lesson: LessonConfig;
  progress: ProgressState;
  onProgress: (lessonId: string, updates: Partial<ProgressState[string]>) => void;
  onReturn: () => void;
}

/**
 * Render a full-screen lesson view with iframe host.
 * Handles Bridge setup, progress updates, and clean unmount.
 */
export function renderLessonView(props: LessonViewProps): HTMLElement {
  const { lesson, progress, onProgress, onReturn } = props;

  const container = document.createElement('section');
  container.className = 'lesson-view';
  container.setAttribute('aria-label', `${lesson.name} lektion`);

  // Header with return button and progress
  const header = document.createElement('header');
  header.className = 'lesson-view__header';

  const title = document.createElement('h1');
  title.className = 'lesson-view__title';
  title.textContent = lesson.name;
  header.appendChild(title);

  // Progress bar
  const progressBar = renderProgressBar();
  header.appendChild(progressBar);

  container.appendChild(header);

  // Return button (fixed position)
  const returnButton = renderReturnButton({
    onClick: () => handleReturn(),
    visible: true,
  });
  container.appendChild(returnButton);

  // Stars display
  const starsDisplay = renderStarsDisplay(
    progress[lesson.id]?.stars ?? 0
  );
  container.appendChild(starsDisplay);

  // Iframe wrapper
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className = 'lesson-view__iframe-wrapper';

  const iframe = document.createElement('iframe');
  iframe.className = 'lesson-view__iframe';
  iframe.title = lesson.name;
  // Sandboxed for security
  iframe.sandbox.add('allow-scripts');
  iframe.sandbox.add('allow-same-origin');
  iframe.src = `about:blank`; // Start blank, set after bridge is ready
  iframeWrapper.appendChild(iframe);
  container.appendChild(iframeWrapper);

  // State
  const bridge = createHubBridge();
  let currentAccuracy = 0;
  let currentStepIndex = 0;
  let currentTotalSteps = 0;

  // Set iframe src now that we're ready
  iframe.src = new URL(lesson.entry, lesson.origin).href;

  // Progress handler
  const unsubscribeProgress = bridge.onProgress((payload: LessonProgressPayload) => {
    currentStepIndex = payload.stepIndex;
    currentTotalSteps = payload.totalSteps;
    currentAccuracy = normalizeAccuracy(payload.accuracy);

    updateProgressBar(
      progressBar as unknown as HTMLElement & { update: (updates: any) => void },
      {
        stepIndex: payload.stepIndex,
        totalSteps: payload.totalSteps,
        accuracy: currentAccuracy,
      }
    );
  });

  // Completion handler
  const unsubscribeComplete = bridge.onComplete((payload: LessonCompletePayload) => {
    const lessonProgress = progress[lesson.id] ?? { stars: 0 };

    // Update progress state
    onProgress(lesson.id, {
      stars: payload.stars,
      bestAccuracy: Math.max(lessonProgress.bestAccuracy ?? 0, normalizeAccuracy(currentAccuracy)),
      completionCount: (lessonProgress.completionCount ?? 0) + 1,
      completedWords: lessonProgress.completedWords ?? {},
      lastPlayedAt: Date.now(),
    });

    // Update stars display
    updateStarsDisplay(starsDisplay, payload.stars);

    // Hide progress, show completion
    progressBar.style.display = 'none';

    // Celebrate
    starsDisplay.classList.add('lesson-view__stars--celebrate');
  });

  // Return handler: fires when the lesson iframe sends LESSON_RETURN.
  const returnHandler = createReturnHandler(LESSON_ORIGIN, handleReturn);
  returnHandler.attach();

  // Cleanup function
  function cleanup() {
    // Clean unmount: blank the iframe to release WebAudio
    iframe.src = 'about:blank';

    // Detach return handler
    returnHandler.detach();

    // Remove bridge listeners
    unsubscribeProgress();
    unsubscribeComplete();
    bridge.destroy();
  }

  function handleReturn() {
    cleanup();
    onReturn();
  }

  // Expose cleanup for external use
  (container as HTMLElement & { cleanup: () => void }).cleanup = cleanup;

  // Listen for iframe load errors
  iframe.addEventListener('error', () => {
    console.error('[LessonView] Failed to load lesson iframe');
  });

  return container;
}

/**
 * Clean up and unmount a lesson view.
 */
export function cleanupLessonView(view: HTMLElement & { cleanup?: () => void }): void {
  if (view.cleanup) {
    view.cleanup();
  }

  // Ensure iframe is blanked even if cleanup failed
  const iframe = view.querySelector('iframe');
  if (iframe) {
    iframe.src = 'about:blank';
  }
}