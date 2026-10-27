# PR: Celebratory Success Animations for Phonics-CVC Lesson (Issue #14)

## Summary

Adds a purely decorative confetti + shooting-star burst animation to the phonics-cvc lesson, triggered only on correct word completion. Respects `prefers-reduced-motion` via a JS guard in `trigger()` and a CSS media query. No sound effects, no impact on drag/drop or touch targets.

## Changes

### Added

- **Celebration component** (`src/components/Celebration.ts`) — `createCelebration()` returns `{ element, trigger, destroy }`. `trigger()` spawns 6 stars + 12 confetti (18 particles total, ≤25), auto-clears after 1500ms via `window.setTimeout`, and cancels any pending burst on re-trigger. `destroy()` clears particles and removes the element from the DOM. All animations are GPU-composited (transform + opacity only).
- **Celebration tests** (`src/components/Celebration.test.ts`) — 6 Vitest tests:
  - Element structure: `celebration` class, `aria-hidden="true"`, `trigger`/`destroy` are functions.
  - Particle spawn counts: 6 stars ±1, 12 confetti ±2, inline CSS custom properties present.
  - Prefers-reduced-motion guard: no particles spawned when motion is reduced.
  - 1500ms auto-clear: particles cleared after advancing fake timers by 1500ms.
  - Re-trigger cancellation: second `trigger()` cancels the first timer and replaces particles with a fresh burst; old timer does not fire early.
  - Destroy + timer cancellation: element removed from parent, particles cleared, `clearTimeout` called, advancing timers after destroy throws no error.
- **Celebration styles** (`src/styles/lesson.css`) — `.celebration` (fixed full-screen, z-index 1500, pointer-events none, overflow hidden), `.star`/`.confetti` keyframes (`star-fly`, `confetti-fall`), and `@media (prefers-reduced-motion: reduce) { .celebration { display: none; } }`.

### Changed

- **Lesson wiring** (`src/lesson.ts`) — Imports `createCelebration`, creates + appends the layer in `showLesson()`, calls `celebration.trigger()` in `onStepComplete()` immediately after `advanceButton.disabled = false;` (after blended playback and status-line clearing), and calls `celebration.destroy()` in the `wireCleanup` callback.

## Testing

### Automated Tests

```bash
cd apps/lessons/phonics-cvc
pnpm vitest run
```

**Results:** 93 Vitest tests pass (87 pre-existing + 6 new), including all `Celebration.test.ts` cases listed above.

### Manual Verification

1. **Start dev server:**
   ```bash
   cd apps/lessons/phonics-cvc
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:5174`

3. **Verify celebration fires on correct completion:**
   - Complete a pass by dropping all tiles correctly
   - A confetti + shooting-star burst appears after the blended playback finishes and the advance button is enabled

4. **Verify no celebration on incorrect attempts:**
   - Drag the wrong tile onto a slot
   - The tile shakes; no celebration animation fires

5. **Verify no drag/drop interference:**
   - While a celebration burst is playing, drag tiles from the tray to the glider
   - Drag ghost (z-index 2000) and completion screen (z-index 2000) render above the celebration layer (z-index 1500); `pointer-events: none` on the celebration layer prevents it from capturing pointer events

6. **Verify prefers-reduced-motion:**
   - Enable "Reduce motion" in OS accessibility settings
   - Complete a pass
   - No animation fires (JS guard in `trigger()` and CSS media query both suppress it)

7. **Verify cleanup:**
   - Close the tab or switch away
   - No leaked timers or DOM nodes; `destroy()` is called via the `wireCleanup` callback

## Breaking Changes

None. All changes are additive. The celebration layer is decorative only (`aria-hidden="true"`), sits below existing interactive layers, and is fully cleaned up on pagehide/visibilitychange.

## Related Issues

- **Issue #14** — Celebratory success animations for phonics-cvc lesson (this PR)
- **Issue #12** — Audio playback UX improvements for phonics-cvc lesson (completed)
- **Issue #5** — Phonics CVC lesson implementation (completed)

## Checklist

- [x] Code builds without errors (`pnpm --filter phonics-cvc build` is green)
- [x] All 93 tests pass
- [x] TypeScript type checking passes
- [x] ESLint clean
- [x] Celebration fires only on correct completion (incorrect path untouched)
- [x] No sound effects (deferred to a separate audio UX issue)
- [x] Drag/drop unaffected (z-index 1500 below drag ghost 2000 and completion screen 2000; pointer-events: none)
- [x] Motion sensitivity: dual guard (JS `matchMedia` + CSS media query)
- [x] Accessibility: `aria-hidden="true"`, decorative only
- [x] 88×88pt touch targets preserved
- [x] Cleanup fires on pagehide/visibilitychange
- [x] Swedish content unchanged