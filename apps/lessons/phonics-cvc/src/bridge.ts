/**
 * Lesson bridge singleton.
 *
 * Wraps the SDK's LessonBridge with the lesson app's HUB_ORIGIN.
 * Safe to call in standalone mode (the SDK no-ops when `window.self === window.top`).
 */

import { LessonBridge } from '@lillskolan/lesson-sdk';
import { HUB_ORIGIN } from './config';

let bridge: LessonBridge | null = null;

export function getLessonBridge(): LessonBridge {
  if (!bridge) {
    bridge = new LessonBridge({ targetOrigin: HUB_ORIGIN });
  }
  return bridge;
}

export function destroyLessonBridge(): void {
  if (bridge) {
    bridge.destroy();
    bridge = null;
  }
}