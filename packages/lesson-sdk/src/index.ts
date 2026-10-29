export const LESSON_EVENTS = ["LESSON_PROGRESS", "LESSON_COMPLETE"] as const;

export type LessonEventType = (typeof LESSON_EVENTS)[number];

export interface LessonProgressPayload {
  stepIndex: number;
  totalSteps: number;
  accuracy: number; // 0-1 or 0-100, bounded
}

export interface LessonCompletePayload {
  stars: number;
  completionTimeMs: number;
  summary: string;
}

export type LessonPayload = LessonProgressPayload | LessonCompletePayload;

export interface LessonMessage<T extends LessonPayload = LessonPayload> {
  type: LessonEventType;
  payload: T;
  timestamp: number;
  source: "lesson" | "hub";
}

export interface LessonBridgeOptions {
  /** Origin to send messages to (required for lesson, optional for hub) */
  targetOrigin?: string;
  /** Allowed origins to accept messages from (required for hub, optional for lesson) */
  allowedOrigins?: string[];
  /** Enable development mode with relaxed origin validation */
  devMode?: boolean;
}

/**
 * LessonBridge - PostMessage communication layer between lesson iframes and the hub.
 *
 * Usage in lesson (iframe):
 *   const bridge = new LessonBridge({ targetOrigin: HUB_ORIGIN });
 *   bridge.sendProgress({ stepIndex: 1, totalSteps: 5, accuracy: 0.8 });
 *   bridge.onComplete((payload) => { ... });
 *
 * Usage in hub (parent):
 *   const bridge = new LessonBridge({ allowedOrigins: [LESSON_ORIGIN] });
 *   bridge.onProgress((payload) => { ... });
 */
export class LessonBridge {
  private targetOrigin: string | undefined;
  private allowedOrigins: string[];
  private devMode: boolean;
  private progressHandlers: Array<(payload: LessonProgressPayload) => void> = [];
  private completeHandlers: Array<(payload: LessonCompletePayload) => void> = [];
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private destroyed = false;

  constructor(options: LessonBridgeOptions = {}) {
    this.targetOrigin = options.targetOrigin;
    this.allowedOrigins = options.allowedOrigins ?? [];
    this.devMode = options.devMode ?? false;

    // Attach listener if we have allowedOrigins (hub mode, needs to receive)
    // OR if we're in an iframe (lesson mode).
    // The standalone check only prevents listener attachment when there's
    // no parent to receive from AND we're not a hub.
    const isHub = this.allowedOrigins.length > 0;
    if (typeof window !== "undefined" && (!this.isStandalone() || isHub)) {
      this.attachListener();
    }
  }

  /**
   * Check if running in standalone mode (not in an iframe).
   * In standalone mode, all methods are safe no-ops.
   */
  isStandalone(): boolean {
    if (typeof window === "undefined") {
      return true;
    }
    try {
      return window.self === window.top;
    } catch {
      // Cross-origin iframe access throws - treat as not standalone
      return false;
    }
  }

  private attachListener(): void {
    if (this.messageHandler) return;

    this.messageHandler = (event: MessageEvent) => {
      if (this.destroyed) return;
      this.handleMessage(event);
    };

    window.addEventListener("message", this.messageHandler);
  }

  private detachListener(): void {
    if (this.messageHandler && typeof window !== "undefined") {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
  }

  private validateOrigin(origin: string): boolean {
    // In dev mode, allow any origin but warn
    if (this.devMode) {
      if (!this.allowedOrigins.includes(origin) && this.targetOrigin !== origin) {
        console.warn(
          `[LessonBridge] Dev mode: accepting message from unlisted origin "${origin}". ` +
            "Add to allowedOrigins or targetOrigin for production."
        );
      }
      return true;
    }

    // Production: strict origin validation
    if (this.allowedOrigins.length > 0) {
      return this.allowedOrigins.includes(origin);
    }

    // Fallback: if no allowedOrigins but targetOrigin is set, allow that
    if (this.targetOrigin) {
      return this.targetOrigin === origin;
    }

    return false;
  }

  private handleMessage(event: MessageEvent): void {
    const { origin, data } = event;

    // Validate origin
    if (!this.validateOrigin(origin)) {
      if (this.devMode) {
        console.warn(`[LessonBridge] Rejected message from unauthorized origin: ${origin}`);
      }
      return;
    }

    // Validate message structure
    if (!this.isValidLessonMessage(data)) {
      if (this.devMode) {
        console.warn("[LessonBridge] Received invalid message structure:", data);
      }
      return;
    }

    const message = data as LessonMessage;

    // Route to appropriate handlers based on type
    switch (message.type) {
      case "LESSON_PROGRESS":
        this.progressHandlers.forEach((handler) => {
          try {
            handler(message.payload as LessonProgressPayload);
          } catch (error) {
            console.error("[LessonBridge] Error in progress handler:", error);
          }
        });
        break;
      case "LESSON_COMPLETE":
        this.completeHandlers.forEach((handler) => {
          try {
            handler(message.payload as LessonCompletePayload);
          } catch (error) {
            console.error("[LessonBridge] Error in complete handler:", error);
          }
        });
        break;
    }
  }

  private isValidLessonMessage(data: unknown): data is LessonMessage {
    if (!data || typeof data !== "object") return false;
    const msg = data as Record<string, unknown>;
    if (
      typeof msg.type !== "string" ||
      !LESSON_EVENTS.includes(msg.type as LessonEventType) ||
      msg.payload === undefined ||
      typeof msg.timestamp !== "number" ||
      (msg.source !== "lesson" && msg.source !== "hub")
    ) {
      return false;
    }
    // Validate payload shape based on message type
    const payload = msg.payload as Record<string, unknown>;
    switch (msg.type) {
      case "LESSON_PROGRESS":
        if (
          typeof payload.stepIndex !== "number" ||
          typeof payload.totalSteps !== "number" ||
          typeof payload.accuracy !== "number"
        ) {
          return false;
        }
        break;
      case "LESSON_COMPLETE":
        if (
          typeof payload.stars !== "number" ||
          typeof payload.completionTimeMs !== "number" ||
          typeof payload.summary !== "string"
        ) {
          return false;
        }
        break;
    }
    return true;
  }

  private createMessage<T extends LessonPayload>(
    type: LessonEventType,
    payload: T,
    source: "lesson" | "hub"
  ): LessonMessage<T> {
    return {
      type,
      payload,
      timestamp: Date.now(),
      source,
    };
  }

  private postMessage(message: LessonMessage): void {
    if (this.destroyed || this.isStandalone()) {
      if (this.devMode) {
        console.debug("[LessonBridge] Standalone mode: message not sent", message);
      }
      return;
    }

    if (!this.targetOrigin) {
      if (this.devMode) {
        console.warn("[LessonBridge] No targetOrigin set, cannot send message");
      }
      return;
    }

    try {
      window.parent.postMessage(message, this.targetOrigin);
    } catch (error) {
      console.error("[LessonBridge] Failed to post message:", error);
    }
  }

  /**
   * Send a progress update from lesson to hub.
   * Only works when running inside an iframe (not standalone).
   */
  sendProgress(payload: LessonProgressPayload): void {
    const message = this.createMessage("LESSON_PROGRESS", payload, "lesson");
    this.postMessage(message);
  }

  /**
   * Send a completion event from lesson to hub.
   * Only works when running inside an iframe (not standalone).
   */
  sendComplete(payload: LessonCompletePayload): void {
    const message = this.createMessage("LESSON_COMPLETE", payload, "lesson");
    this.postMessage(message);
  }

  /**
   * Register a handler for progress events (hub side).
   * Returns an unsubscribe function.
   */
  onProgress(handler: (payload: LessonProgressPayload) => void): () => void {
    this.progressHandlers.push(handler);
    return () => {
      const idx = this.progressHandlers.indexOf(handler);
      if (idx >= 0) this.progressHandlers.splice(idx, 1);
    };
  }

  /**
   * Register a handler for complete events (hub side).
   * Returns an unsubscribe function.
   */
  onComplete(handler: (payload: LessonCompletePayload) => void): () => void {
    this.completeHandlers.push(handler);
    return () => {
      const idx = this.completeHandlers.indexOf(handler);
      if (idx >= 0) this.completeHandlers.splice(idx, 1);
    };
  }

  /**
   * Clean up event listeners and handlers.
   * Call when the bridge is no longer needed.
   */
  destroy(): void {
    this.detachListener();
    this.progressHandlers = [];
    this.completeHandlers = [];
    this.destroyed = true;
    this.targetOrigin = undefined;
  }
}// test sdk
