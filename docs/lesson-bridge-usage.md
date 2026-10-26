# LessonBridge Usage

Quick reference for lesson↔hub communication via postMessage.

## Lesson Side (iframe)

```typescript
import { LessonBridge, LessonProgressPayload, LessonCompletePayload } from '@lillskolan/lesson-sdk';

const HUB_ORIGIN = 'http://localhost:5173';
const bridge = new LessonBridge({ targetOrigin: HUB_ORIGIN });

// Send progress update
bridge.sendProgress({
  stepIndex: 1,
  totalSteps: 5,
  accuracy: 0.8
});

// Send completion
bridge.sendComplete({
  stars: 3,
  completionTimeMs: 120000,
  summary: '3/5 words correct'
});
```

## Hub Side (parent)

```typescript
import { LessonBridge } from '@lillskolan/lesson-sdk';

const LESSON_ORIGIN = 'http://localhost:5174';
const bridge = new LessonBridge({ 
  allowedOrigins: [LESSON_ORIGIN]
});

// Listen for progress
const unsubscribe = bridge.onProgress((payload) => {
  console.log('Progress:', payload.stepIndex, '/', payload.totalSteps);
});

// Listen for completion
bridge.onComplete((payload) => {
  console.log('Complete:', payload.stars, 'stars');
});

// Cleanup
bridge.destroy();
```

## Standalone Mode

Bridge auto-detects standalone mode (not in iframe) and no-ops all messages safely. Useful for development and testing without the Hub iframe host.
