import { LessonBridge } from '@lillskolan/lesson-sdk';
import { LESSON_ORIGIN } from './config';

/**
 * Create a LessonBridge configured for the hub (parent window).
 * Uses LESSON_ORIGIN for origin validation.
 * In dev mode, allows relaxed origin checking.
 */
export function createHubBridge(): LessonBridge {
  const devMode = (import.meta as unknown as { env: { DEV?: boolean } }).env?.DEV === true;

  return new LessonBridge({
    allowedOrigins: [LESSON_ORIGIN],
    devMode,
  });
}

/**
 * Create a LessonBridge configured for a lesson (iframe).
 * Uses HUB_ORIGIN as the target origin.
 * In dev mode, allows relaxed origin checking.
 */
export function createLessonBridge(hubOrigin: string): LessonBridge {
  const devMode = (import.meta as unknown as { env: { DEV?: boolean } }).env?.DEV === true;

  return new LessonBridge({
    targetOrigin: hubOrigin,
    allowedOrigins: [hubOrigin],
    devMode,
  });
}