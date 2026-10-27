# PR: Audio Playback UX Improvements for Phonics-CVC Lesson (Issue #12)

## Summary

Improves audio interaction in the phonics-cvc lesson: tile click plays phonemes immediately, word display is clickable for blended replay, overlapping audio is fixed by stopping the engine before play, drag interactions gain an 8px movement threshold, and ChunkTray gains an update pattern with tile-click callbacks.

## Changes

### Added

- **Tile click audio** (`src/lesson.ts`) — Phoneme tile `onClick` now calls the audio engine to play the clip immediately. Click handlers resolve clip IDs from the manifest, never hardcoded strings.
- **Word display click handler** (`src/lesson.ts`) — The rendered word is now clickable; clicking replays the full blended word by calling `playBlended()` with the current pass's chunk clip IDs.
- **Drag movement threshold** (`src/drag/DragSession.ts`) — Added `DRAG_THRESHOLD = 8` (pixels). A drag only starts when pointer movement exceeds 8px; taps within the threshold remain clicks. Prevents accidental drag activation on touch devices.
- **ChunkTray update method** (`src/components/ChunkTray.ts`) — Added `update(props)` to reconcile tray state in place when the active pass changes, avoiding full re-mount.
- **ChunkTray onTileClick callback** (`src/components/ChunkTray.ts`) — Added `onTileClick?: (chunk: PhonemeChunk) => void` prop; each tile forwards its chunk to the callback on click.

### Changed

- **Stop-before-play guard** (`src/audio/PhonemeEngine.ts` via `src/lesson.ts`) — Before playing a blended word or new chunk sequence, the engine calls `stop()` to terminate all active `AudioBufferSourceNode` instances. This fixes simultaneous chunk playback that caused overlapping and garbled audio.
- **Lesson wiring** (`src/lesson.ts`) — Lesson now wires `onTileClick` and word-click to the audio engine, and calls `engine.stop()` before `engine.playBlended()`.

### Fixed

- **Overlapping audio bug** — Previously, starting a new playback chain while sources were still active caused clips to stack. The stop-before-play sequence guarantees at most one active chain.
- **Accidental drag on tap** — DragSession now ignores pointer movements under 8px, so taps no longer trigger the sound-glider drag mechanic.

## Testing

### Automated Tests

```bash
cd apps/lessons/phonics-cvc
pnpm vitest run
```

**Results:** 87 Vitest tests pass, including new and updated tests for:
- `DragSession.test.ts` — threshold behavior (drag starts only after 8px movement; taps below threshold remain clicks)
- `ChunkTray` — `update()` reconciliation and `onTileClick` callback firing
- `PhonemeEngine` — stop-before-play sequence and no overlapping sources

### Manual Verification

1. **Start dev server:**
   ```bash
   cd apps/lessons/phonics-cvc
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:5174`

3. **Verify tile click audio:**
   - Tap any phoneme tile
   - Audio plays immediately (low latency, no overlap with prior clips)

4. **Verify word replay:**
   - Complete a pass (click "Nästa")
   - Click the displayed word
   - The full blended word replays

5. **Verify no overlap:**
   - Rapidly click multiple tiles in sequence
   - Each clip plays cleanly; no stacking or garbled output

6. **Verify drag threshold:**
   - Tap and hold a tile without moving
   - Drag behavior does not trigger (treated as click)
   - Move pointer 8px+ and drag starts

7. **Verify pass switching:**
   - Click "Nästa" to switch passes
   - ChunkTray updates in place (no re-mount, focus preserved)

## Breaking Changes

None. All changes are additive or internal behavior fixes. The `onTileClick` and `update()` APIs are new; existing consumers that do not use them are unaffected.

## Related Issues

- **Issue #12** — Audio playback UX improvements for phonics-cvc lesson (this PR)
- **Issue #5** — Phonics CVC lesson implementation (completed)
- **Issue #6** — Sound glider mechanic + playbackRate integration (next)

## Checklist

- [x] Code builds without errors
- [x] All 87 tests pass
- [x] TypeScript type checking passes
- [x] ESLint clean
- [x] ADR 0007 created documenting audio UX decisions
- [x] No overlapping audio verified manually
- [x] Drag threshold verified manually
- [x] Tile click and word replay verified manually
- [x] ChunkTray update pattern verified manually
- [x] Swedish content unchanged