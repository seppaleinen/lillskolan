## [Unreleased] - Phonics-CVC Audio Playback UX (Issue #12)

### Added

- **Tile click audio** (`src/lesson.ts`) — Phoneme tile `onClick` now plays the clip immediately via the audio engine. Clip IDs resolve from the manifest, never hardcoded strings.
- **Word display click handler** (`src/lesson.ts`) — The rendered word is now clickable; clicking replays the full blended word by calling `playBlended()` with the current pass's chunk clip IDs.
- **Drag movement threshold** (`src/drag/DragSession.ts`) — Added `DRAG_THRESHOLD = 8` (pixels). A drag only starts when pointer movement exceeds 8px; taps within the threshold remain clicks. Prevents accidental drag activation on touch devices.
- **ChunkTray update method** (`src/components/ChunkTray.ts`) — Added `update(props)` to reconcile tray state in place when the active pass changes, avoiding full re-mount.
- **ChunkTray onTileClick callback** (`src/components/ChunkTray.ts`) — Added `onTileClick?: (chunk: PhonemeChunk) => void` prop; each tile forwards its chunk to the callback on click.

### Changed

- **Stop-before-play guard** — Before playing a blended word or new chunk sequence, the engine calls `stop()` to terminate all active `AudioBufferSourceNode` instances. This fixes simultaneous chunk playback that caused overlapping and garbled audio.
- **Lesson wiring** (`src/lesson.ts`) — Lesson now wires `onTileClick` and word-click to the audio engine, and calls `engine.stop()` before `engine.playBlended()`.

### Fixed

- **Overlapping audio bug** — Previously, starting a new playback chain while sources were still active caused clips to stack. The stop-before-play sequence guarantees at most one active chain.
- **Accidental drag on tap** — DragSession now ignores pointer movements under 8px, so taps no longer trigger the sound-glider drag mechanic.

### Testing

- **87 Vitest tests pass** — including new and updated tests for `DragSession` threshold behavior, `ChunkTray` `update()` reconciliation and `onTileClick` callback, and `PhonemeEngine` stop-before-play sequence.
- **Manual verification** — tile click audio, word replay, no overlap on rapid clicks, drag threshold behavior, and pass switching all verified in browser.

### Documentation

- **ADR 0007** — Phonics-CVC Audio Playback UX, documenting manifest-driven audio, stop-before-play, drag threshold, and ChunkTray update pattern.
- **PR description** — `docs/pr/issue-12-phonics-cvc-audio-ux.md`

### Removed

- None