/**
 * Return protocol (hub side).
 *
 * Re-declared locally to keep hub and lesson apps decoupled — the lesson
 * sends `LESSON_RETURN` via `window.parent.postMessage`; the hub listens
 * here and filters by origin + type.
 */

export const LESSON_RETURN = 'LESSON_RETURN' as const;

export interface ReturnHandler {
  attach(): void;
  detach(): void;
}

/**
 * Create a message listener that fires `onReturn` only for messages that
 * originate from `origin` and carry `type === LESSON_RETURN`.
 */
export function createReturnHandler(origin: string, onReturn: () => void): ReturnHandler {
  function handleMessage(event: MessageEvent): void {
    if (event.origin !== origin) return;
    const data = event.data as { type?: unknown } | null | undefined;
    if (!data || data.type !== LESSON_RETURN) return;
    onReturn();
  }

  return {
    attach(): void {
      window.addEventListener('message', handleMessage);
    },
    detach(): void {
      window.removeEventListener('message', handleMessage);
    },
  };
}