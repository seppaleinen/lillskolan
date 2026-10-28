# Changelog

## Unreleased

### Added
- `LessonBridge` class in `packages/lesson-sdk` for typed postMessage communication
- **Progressive distractor tiles** in phonics-cvc ChunkTray (issue #16) — Pass 1 steps show 2 phonetically plausible single-consonant distractors alongside correct chunks; Pass 2 steps remain without distractors (baseline)
- **Piper TTS context-dependent onset generation** (Issue #11) — `scripts/generate-onsets-piper.mjs` generates `b_i.wav`, `b_a.wav`, `h_u.wav` using Piper TTS with the Swedish `sv_SE-alma-medium` voice; manifest expanded to 25 unique clips; optional `onsetContext?: string` field added to `PhonemeChunk` (documentation-only)
- **Manifest** — Added `onsetContext?: string` to `PhonemeChunk` (Issue #11)

### Changed
- Added `LessonProgressPayload` and `LessonCompletePayload` types
- Added origin validation and standalone detection
- **ChunkTray responsive layout** — `flexWrap + overflowX:auto + maxWidth:100%` adapts 4–6 tiles without squeezing below 88×88px touch targets
- **DropResult contract** — Returns filled slot index (not tray index) for correct UI highlighting with shuffled tiles
- **PhonemePass type** — Optional `distractors?: PhonemeChunk[]` in manifest

### Testing
- Added Vitest test suite with 21 tests covering validation, standalone mode, and round-trip communication
- **122/122 Vitest tests pass** (13 files) including new distractor tests: deterministic shuffle, drop validation, cap at 6, backward compatibility

## Phase 1

Initial monorepo setup with Hub, lesson scaffold, and SDK foundation.
