# LessonBridge postMessage Protocol

Status: Proposed

## Context

Lesson↔Hub communication via postMessage in the Lillskolan monorepo. The Hub app (port 5173) embeds lesson pages (port 5174) in sandboxed iframes. Communication must be type-safe, secure, and work consistently in development and production. Previously, ad-hoc postMessage usage led to inconsistent payload shapes and missing origin validation.

## Decision

Implement `LessonBridge` class in `packages/lesson-sdk` with:
- Typed payloads: `LessonProgressPayload` and `LessonCompletePayload`
- Origin validation via `allowedOrigins` config with devMode relaxation
- Standalone detection for safe no-ops when lesson runs outside iframe

The bridge exposes `sendProgress()`, `sendComplete()` for lessons and `onProgress()`, `onComplete()` for hub. Messages use enum `LESSON_EVENTS` and structured envelope with timestamp, type, payload, and source.

## Consequences

Positive:
- Type safety across Hub and lesson boundaries
- Origin security enforced in production, relaxed in dev
- Dev/prod parity via devMode flag
- 21 Vitest tests covering validation, standalone, and round-trip

Negative:
- Bundle size impact minimal but present
- Requires consistent `HUB_ORIGIN`/`LESSON_ORIGIN` config across apps
