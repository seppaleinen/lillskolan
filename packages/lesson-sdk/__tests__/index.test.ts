import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LessonBridge, LESSON_EVENTS, LessonProgressPayload, LessonCompletePayload, LessonMessage } from '../src/index';

describe('LessonBridge', () => {
  describe('LESSON_EVENTS', () => {
    it('should export correct events', () => {
      expect(LESSON_EVENTS).toEqual(['LESSON_PROGRESS', 'LESSON_COMPLETE']);
    });
  });

  describe('Payload shape validation', () => {
    it('should accept valid LessonProgressPayload', () => {
      const payload: LessonProgressPayload = {
        stepIndex: 1,
        totalSteps: 5,
        accuracy: 0.85,
      };
      expect(payload.stepIndex).toBe(1);
      expect(payload.totalSteps).toBe(5);
      expect(payload.accuracy).toBe(0.85);
    });

    it('should accept valid LessonCompletePayload', () => {
      const payload: LessonCompletePayload = {
        stars: 3,
        completionTimeMs: 120000,
        summary: '3/5 words correct',
      };
      expect(payload.stars).toBe(3);
      expect(payload.completionTimeMs).toBe(120000);
      expect(payload.summary).toBe('3/5 words correct');
    });

    it('should create valid LessonMessage envelope', () => {
      const progressPayload: LessonProgressPayload = {
        stepIndex: 2,
        totalSteps: 5,
        accuracy: 1,
      };
      const message: LessonMessage<LessonProgressPayload> = {
        type: 'LESSON_PROGRESS',
        payload: progressPayload,
        timestamp: Date.now(),
        source: 'lesson',
      };
      expect(message.type).toBe('LESSON_PROGRESS');
      expect(message.source).toBe('lesson');
      expect(typeof message.timestamp).toBe('number');
    });
  });

  describe('Standalone detection', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: global.window,
        parent: global.window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        postMessage: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should detect standalone when window.self === window.top', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173' });
      expect(bridge.isStandalone()).toBe(true);
    });

    it('should return true when window is undefined (SSR)', () => {
      // @ts-expect-error - simulating SSR
      global.window = undefined;

      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173' });
      expect(bridge.isStandalone()).toBe(true);
    });
  });

  describe('Standalone no-op behavior', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: global.window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should no-op sendProgress when standalone', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173', devMode: true });
      bridge.sendProgress({ stepIndex: 1, totalSteps: 5, accuracy: 0.8 });
      expect(global.window.parent.postMessage).not.toHaveBeenCalled();
    });

    it('should no-op sendComplete when standalone', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173', devMode: true });
      bridge.sendComplete({ stars: 3, completionTimeMs: 1000, summary: 'done' });
      expect(global.window.parent.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Origin validation', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: { postMessage: vi.fn() } as unknown as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should accept messages from allowedOrigins in production', () => {
      const progressHandler = vi.fn();
      const bridge = new LessonBridge({
        allowedOrigins: ['http://localhost:5174'],
        devMode: false,
      });
      bridge.onProgress(progressHandler);

      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 1, totalSteps: 5, accuracy: 0.8 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stepIndex: 1, totalSteps: 5, accuracy: 0.8 })
      );
    });

    it('should accept messages from targetOrigin when no allowedOrigins set', () => {
      const progressHandler = vi.fn();
      const bridge = new LessonBridge({
        targetOrigin: 'http://localhost:5174',
        devMode: false,
      });
      bridge.onProgress(progressHandler);

      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 2, totalSteps: 5, accuracy: 0.9 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(progressHandler).toHaveBeenCalledWith(
        expect.objectContaining({ stepIndex: 2, totalSteps: 5, accuracy: 0.9 })
      );
    });

    it('should warn but accept any origin in devMode', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const progressHandler = vi.fn();

      const bridge = new LessonBridge({
        allowedOrigins: ['http://localhost:5174'],
        devMode: true,
      });
      bridge.onProgress(progressHandler);

      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 1, totalSteps: 5, accuracy: 0.25 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:9999',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(progressHandler).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Dev mode: accepting message from unlisted origin')
      );
      consoleWarn.mockRestore();
    });

    it('should reject messages with invalid structure', () => {
      const progressHandler = vi.fn();
      const bridge = new LessonBridge({
        allowedOrigins: ['http://localhost:5174'],
        devMode: true,
      });
      bridge.onProgress(progressHandler);

      const event = new MessageEvent('message', {
        data: { invalid: 'structure' },
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(progressHandler).not.toHaveBeenCalled();
    });
  });

  describe('Message sending', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: { postMessage: vi.fn() } as unknown as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should send LESSON_PROGRESS with correct envelope', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173' });
      bridge.sendProgress({ stepIndex: 1, totalSteps: 3, accuracy: 0.6 });
      expect(global.window.parent.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LESSON_PROGRESS',
          payload: expect.objectContaining({
            stepIndex: 1,
            totalSteps: 3,
            accuracy: 0.6,
          }),
          source: 'lesson',
        }),
        'http://localhost:5173'
      );
    });

    it('should send LESSON_COMPLETE with correct envelope', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173' });
      bridge.sendComplete({ stars: 2, completionTimeMs: 90000, summary: 'lesson done' });
      expect(global.window.parent.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LESSON_COMPLETE',
          payload: expect.objectContaining({
            stars: 2,
            completionTimeMs: 90000,
            summary: 'lesson done',
          }),
          source: 'lesson',
        }),
        'http://localhost:5173'
      );
    });
  });

  describe('Handler registration', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: { postMessage: vi.fn() } as unknown as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should register and unsubscribe onProgress handler', () => {
      const bridge = new LessonBridge({ allowedOrigins: ['http://localhost:5174'] });
      const handler = vi.fn();
      const unsubscribe = bridge.onProgress(handler);
      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 1, totalSteps: 3, accuracy: 0.5 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple handlers for same event', () => {
      const bridge = new LessonBridge({ allowedOrigins: ['http://localhost:5174'] });
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.onProgress(handler1);
      bridge.onProgress(handler2);

      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 1, totalSteps: 3, accuracy: 0.5 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy', () => {
    let originalWindow: Window & typeof globalThis;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        ...global.window,
        self: global.window,
        top: { postMessage: vi.fn() } as unknown as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.clearAllMocks();
    });

    it('should remove event listener on destroy', () => {
      const bridge = new LessonBridge({ allowedOrigins: ['http://localhost:5174'] });
      bridge.destroy();
      expect(global.window.removeEventListener).toHaveBeenCalled();
    });

    it('should clear all handlers on destroy', () => {
      const bridge = new LessonBridge({ allowedOrigins: ['http://localhost:5174'] });
      const handler = vi.fn();
      bridge.onProgress(handler);
      bridge.destroy();

      const message: LessonMessage = {
        type: 'LESSON_PROGRESS',
        payload: { stepIndex: 1, totalSteps: 3, accuracy: 0.5 },
        timestamp: Date.now(),
        source: 'lesson',
      };

      const event = new MessageEvent('message', {
        data: message,
        origin: 'http://localhost:5174',
      });

      (bridge as unknown as { handleMessage: (e: MessageEvent) => void }).handleMessage(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should no-op send methods after destroy', () => {
      const bridge = new LessonBridge({ targetOrigin: 'http://localhost:5173' });
      bridge.destroy();
      bridge.sendProgress({ stepIndex: 1, totalSteps: 3, accuracy: 0.5 });
      bridge.sendComplete({ stars: 2, completionTimeMs: 1000, summary: 'done' });

      expect(global.window.parent.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Round-trip demonstration: lesson -> hub', () => {
    it('should demonstrate lesson posting progress and hub receiving it', () => {
      const lessonWindow = {
        self: {} as Window,
        top: {} as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const hubWindow = {
        self: {} as Window,
        top: {} as Window,
        parent: {} as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        postMessage: vi.fn(),
      };

      global.window = lessonWindow as unknown as Window & typeof globalThis;
      const lessonBridge = new LessonBridge({
        targetOrigin: 'http://localhost:5173',
        devMode: true,
      });

      global.window = hubWindow as unknown as Window & typeof globalThis;
      const hubBridge = new LessonBridge({
        allowedOrigins: ['http://localhost:5174'],
        devMode: false,
      });

      expect((hubWindow.addEventListener as any).mock.calls.length).toBeGreaterThan(0);
      const [eventType, hubHandler] = (hubWindow.addEventListener as any).mock.calls[0];
      expect(eventType).toBe('message');

      const hubProgressHandler = vi.fn();
      hubBridge.onProgress(hubProgressHandler);

      global.window = lessonWindow as unknown as Window & typeof globalThis;
      lessonBridge.sendProgress({
        stepIndex: 1,
        totalSteps: 5,
        accuracy: 0.75,
      });

      const sentMessage = (lessonWindow.parent.postMessage as any).mock.calls[0][0];
      const receiveEvent = new MessageEvent('message', {
        data: sentMessage,
        origin: 'http://localhost:5174',
      });

      global.window = hubWindow as unknown as Window & typeof globalThis;
      hubHandler(receiveEvent);

      expect(hubProgressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          stepIndex: 1,
          totalSteps: 5,
          accuracy: 0.75,
        })
      );

      expect(sentMessage).toMatchObject({
        type: 'LESSON_PROGRESS',
        source: 'lesson',
        payload: expect.objectContaining({ stepIndex: 1 }),
      });
      expect(typeof sentMessage.timestamp).toBe('number');
    });

    it('should demonstrate lesson posting complete and hub receiving it', () => {
      const lessonWindow = {
        self: {} as Window,
        top: {} as Window,
        parent: { postMessage: vi.fn() } as unknown as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const hubWindow = {
        self: {} as Window,
        top: {} as Window,
        parent: {} as Window,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        postMessage: vi.fn(),
      };

      global.window = lessonWindow as unknown as Window & typeof globalThis;
      const lessonBridge = new LessonBridge({
        targetOrigin: 'http://localhost:5173',
        devMode: true,
      });

      global.window = hubWindow as unknown as Window & typeof globalThis;
      const hubBridge = new LessonBridge({
        allowedOrigins: ['http://localhost:5174'],
        devMode: false,
      });

      expect((hubWindow.addEventListener as any).mock.calls.length).toBeGreaterThan(0);
      const [eventType, hubHandler] = (hubWindow.addEventListener as any).mock.calls[0];
      expect(eventType).toBe('message');

      const hubCompleteHandler = vi.fn();
      hubBridge.onComplete(hubCompleteHandler);

      global.window = lessonWindow as unknown as Window & typeof globalThis;
      lessonBridge.sendComplete({
        stars: 3,
        completionTimeMs: 180000,
        summary: 'all words correct',
      });

      const sentMessage = (lessonWindow.parent.postMessage as any).mock.calls[0][0];
      const receiveEvent = new MessageEvent('message', {
        data: sentMessage,
        origin: 'http://localhost:5174',
      });

      global.window = hubWindow as unknown as Window & typeof globalThis;
      hubHandler(receiveEvent);

      expect(hubCompleteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          stars: 3,
          completionTimeMs: 180000,
          summary: 'all words correct',
        })
      );

      expect(sentMessage).toMatchObject({
        type: 'LESSON_COMPLETE',
        source: 'lesson',
        payload: expect.objectContaining({ stars: 3 }),
      });
    });
  });
});