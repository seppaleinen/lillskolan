/**
 * Return protocol — message sent from a lesson iframe back to the hub
 * when the user chooses to return to the lesson overview.
 */

export const LESSON_RETURN = 'LESSON_RETURN' as const;

export interface ReturnMessage {
  type: typeof LESSON_RETURN;
  source: 'lesson';
  timestamp: number;
}

export function createReturnMessage(): ReturnMessage {
  return {
    type: LESSON_RETURN,
    source: 'lesson',
    timestamp: Date.now(),
  };
}