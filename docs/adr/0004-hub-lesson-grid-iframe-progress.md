# 0004 Hub lesson grid iframe progress

Status: Accepted

## Context

The Lillskolan project needed a central hub application to serve as the entry point for children learning to read Swedish.

The hub must display available lessons in a kid-friendly grid interface, host lesson pages in sandboxed iframes for isolation and security, track and persist user progress across sessions, and communicate safely with lessons via the LessonBridge postMessage protocol from issue #3.

Previously, each lesson ran standalone with no persistence or unified experience.

## Decision

Implement the Hub application (apps/hub/) as a vanilla TypeScript app with the following architecture.

### Core components

- HubApp state machine in main.ts manages navigation between grid and lesson views and coordinates progress updates
- LessonGrid component displays available lessons with progress indicators and star ratings
- LessonView component hosts the sandboxed iframe, handles LessonBridge integration
- ProgressBar and StarsDisplay components provide visual feedback for lesson progress
- ReturnButton component enables navigation back to grid and releases WebAudio resources

### Technical decisions

1. **Sandboxed iframes with sandbox="allow-scripts allow-same-origin"** and `loading="lazy"` isolate execution contexts while allowing postMessage communication
2. **Origin validation** with Hub on port 5173 and lessons on port 5174. Strict origin checking in production, relaxed with `devMode` in development
3. **localStorage persistence** with versioned key `lillskolan.progress.v1` supports future schema migrations
4. **Config-driven lesson registry** in `lessons.ts` provides single source of truth. Adding a lesson requires one entry
5. **Vanilla TypeScript components** with no framework dependencies. Components are pure functions returning DOM elements
6. **WebAudio cleanup** by setting `iframe.src` to `about:blank` on return to grid releases audio nodes and ensures clean state

### LessonBridge integration

The Hub uses `LessonBridge` from `packages/lesson-sdk` to listen for `LESSON_PROGRESS` events `{ stepIndex, totalSteps, accuracy }` and `LESSON_COMPLETE` events `{ stars, completionTimeMs, summary }`, validating message origins against configured `LESSON_ORIGIN`.

## Consequences

### Positive

- Unified experience with single entry point and consistent navigation
- Progress tracking with persistent stars and accuracy motivates repeated practice
- Security via sandboxed iframes prevents lessons from accessing Hub DOM or cookies
- Type safety via `LessonBridge` ensures typed communication between Hub and lessons
- Testability with vanilla TS components easily unit-tested. 21 Vitest tests pass
- Extensibility with new lessons requiring only config changes in `lessons.ts`
- Tablet-first design with touch targets >=88x88pt, system UI typography >=18px, Swedish text only

### Negative

- Bundle size increase of approximately 15KB for Hub app
- Configuration overhead requires symmetric `HUB_ORIGIN` and `LESSON_ORIGIN` config across apps
- Dev server orchestration requires `concurrently` to run Hub (5173) and lessons (5174) simultaneously
- **CSP considerations.** Security audit recommends adding `frame-ancestors` directive to lesson CSP headers

### Follow-up items

- Implement CSP header on lesson app: `frame-ancestors http://localhost:5173` in development, hub domain only in production
- Add migration logic for future `lillskolan.progress.v2` schema changes
- Consider lesson categories or age groups as lesson count grows