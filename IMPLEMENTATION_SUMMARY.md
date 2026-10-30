# Issue #12 — Audio Playback UX Improvements

## Summary
Fixed all three audio playback UX issues in `apps/lessons/phonics-cvc/src/lesson.ts`:

### #1 — Tile click plays phoneme clip ✅
**Status:** Already working, verified.
- The `onTileClick` handler at line 149 correctly calls `audioEngine.play(tileOption.chunk.clip)`
- Clip IDs come from the manifest and map correctly to WAV assets
- No changes needed

### #2 — Word display clickable to replay full word ✅
**Fix:** Added a visible speaker button next to the word display.
- Created a `wordSection` container with flex layout
- Added a speaker button (🔊) with Swedish aria-label "Läss ordet"
- Extracted replay logic into `replayWord()` function
- Both word display and speaker button trigger blended playback
- Button click does not propagate to word display (avoids double-trigger)

### #3 — Simultaneous chunk playback bug ✅
**Fix:** Restructured `handleDrop()` to prevent overlapping audio.
- **Before:** Individual chunk clip played on every drop, then blended playback fired on step complete → overlap on final drop
- **After:** 
  - On step complete: ONLY blended playback via `onStepComplete()`
  - On intermediate drops: individual chunk clip plays, but `audioEngine.stop()` is called first to cancel any in-flight clip
  - This ensures no two clips ever play simultaneously

## Changes Made

### `apps/lessons/phonics-cvc/src/lesson.ts`

1. **Lines 100-150:** Word display + speaker button
   - Wrapped word display in flex container
   - Added speaker button with 🔊 emoji
   - Extracted `replayWord()` async function
   - Attached click handlers to both word display and speaker button

2. **Lines 269-283:** Handle drop audio fix
   - Moved `machine.isStepComplete()` check BEFORE audio playback
   - When step is complete: call `onStepComplete()` directly (blended playback only)
   - When step is not complete: stop any in-flight clip, then play individual chunk
   - Added comment explaining the fix

## Testing
- ✅ All 160 tests pass
- ✅ TypeScript typecheck passes
- ✅ No regressions in existing functionality

## Acceptance Criteria Met
- ✅ Clicking any character tile in the tray plays its phoneme clip immediately
- ✅ Word display is clickable AND has a speaker button to replay the full assembled word
- ✅ When a word is completed correctly, the engine plays ONLY blended playback (no overlapping clips)
- ✅ No audio regressions: existing drag-blending playback remains functional
- ✅ All content in Swedish (aria-label: "Läss ordet")
