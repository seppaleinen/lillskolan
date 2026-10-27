# 0007 Phonics-CVC Audio Playback UX

Status: Accepted

## Context

The phonics-cvc lesson (issue #5) shipped with a WebAudio phoneme engine and Tap-to-Start gate, but the audio playback UX had gaps that surfaced during manual testing and issue #12:

- Phoneme tiles did not play audio on click — the engine existed but was not wired to tile interaction.
- The word display was not clickable, so learners could not replay the blended word after a pass completed.
- Simultaneous chunk playback caused overlapping audio: when the engine was told to play a new sequence while a previous one was still active, sources stacked and produced garbled output.
- Drag interactions (issue #6, playbackRate-based sound glider) had no movement threshold, so accidental taps triggered drag behavior.
- `ChunkTray` was immutable after mount — it could not respond to prop changes (e.g., switching passes) without a full re-mount.

## Decision

1. **Manifest-driven audio only**

   All audio originates from the `PhonemeManifest` in `public/manifest/phoneme-manifest.json`. The engine loads exactly the clips the manifest declares; no audio is synthesized or injected outside the manifest pipeline. Tile click handlers resolve clip IDs from the manifest, never from hardcoded strings.

2. **Stop before play to prevent overlap**

   Before playing a blended word or a new chunk sequence, the engine calls `stop()` to terminate all active `AudioBufferSourceNode` instances tracked in its internal `Set`. This guarantees at most one playback chain is active at any time.

   ```typescript
   playBlended(clipIds: string[]): void {
     this.stop(); // terminate any in-flight sources
     clipIds.forEach((id) => this.play(id));
   }
   ```

3. **Drag movement threshold of 8px**

   `DragSession` in `src/drag/DragSession.ts` now requires a pointer movement of at least 8 pixels before a drag is considered started. Taps that stay within the threshold are treated as clicks, not drags. This prevents the sound-glider mechanic from firing on accidental touches.

   ```typescript
   const DRAG_THRESHOLD = 8;
   // drag only starts when |dx| + |dy| >= DRAG_THRESHOLD
   ```

4. **ChunkTray update pattern**

   `ChunkTray` gained an `update()` method and an `onTileClick` callback prop. Instead of re-mounting the tray when the active pass changes, the parent calls `update(props)` to reconcile state in place. Tile clicks invoke `onTileClick(chunk)`, which the lesson page wires to the audio engine.

## Consequences

### Positive

- **Immediate audio feedback**: Tapping a phoneme tile plays the clip with no extra latency (AudioBuffers are preloaded).
- **Replayable blended words**: Clickable word display lets learners hear the full blend again after each pass.
- **Clean audio**: The stop-before-play guard eliminates overlapping sources and garbled playback.
- **Clean drag behavior**: The 8px threshold separates taps from drags, reducing accidental activation on touch devices.
- **No re-mount churn**: The `update()` pattern lets ChunkTray respond to pass changes without losing focus or re-rendering the grid.
- **Manifest integrity**: All audio paths remain manifest-driven; no ad-hoc clip loading.

### Negative

- **Stop latency**: `stop()` iterates active sources on every new play request; negligible for the current 2–3 clip sequences but should be watched if chunk counts grow.
- **Threshold tuning**: 8px is a heuristic; some users with large fingers or shaky hands may still trigger unintended drags. Documented as a tunable constant.
- **Update API surface**: Adding `update()` and `onTileClick` to ChunkTray increases the component's prop contract; future changes must maintain backward compatibility.

### Follow-up

- Consider debouncing rapid tile clicks to prevent double-triggering on slow devices.
- Evaluate whether the drag threshold should scale with touch target size for accessibility.
- Add a visual "now playing" highlight on the active tile for stronger feedback.