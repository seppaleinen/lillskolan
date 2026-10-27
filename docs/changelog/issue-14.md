## [Unreleased] - Celebratory Success Animations (Issue #14)

### Added

- **Celebration component** (`src/components/Celebration.ts`) — `createCelebration(): { element, trigger, destroy }`. Decorative confetti + shooting-star burst for correct word completion. `trigger()` spawns 6 stars + 12 confetti (18 particles, ≤25), auto-clears after 1500ms via `window.setTimeout`, cancels previous burst on re-trigger. `destroy()` clears particles and removes the element from the DOM.
- **Celebration tests** (`src/components/Celebration.test.ts`) — 6 Vitest tests covering element structure, particle spawn counts, prefers-reduced-motion guard, 1500ms auto-clear, re-trigger cancellation, and destroy + timer cancellation.
- **Celebration styles** (`src/styles/lesson.css`) — `.celebration` (fixed full-screen, z-index 1500, pointer-events none, overflow hidden), `.star`/`.confetti` keyframes, and `@media (prefers-reduced-motion: reduce) { .celebration { display: none; } }`.

### Changed

- **Lesson wiring** (`src/lesson.ts`) — Imports `createCelebration`, creates + appends the layer in `showLesson()`, calls `celebration.trigger()` in `onStepComplete()` immediately after `advanceButton.disabled = false;` (after blended playback and status-line clearing), and calls `celebration.destroy()` in the `wireCleanup` callback.

### Fixed

- None

### Testing

- **93 Vitest tests pass** — 87 pre-existing + 6 new in `Celebration.test.ts`.
- **Manual verification** — confetti burst fires only on correct completion, no interference with drag/drop, reduced-motion users see no animation, cleanup fires on pagehide/visibilitychange.

### Documentation

- **PR description** — `docs/pr/issue-14-celebration-animations.md`

### Removed

- None