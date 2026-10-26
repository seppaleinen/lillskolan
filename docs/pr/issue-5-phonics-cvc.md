# PR: Phonics CVC Lesson Implementation (Issue #5)

## Summary

Implements the phonics-cvc lesson with WebAudio phoneme engine, Tap-to-Start gate, and manifest-driven asset pipeline for Swedish CVC word blending practice.

## Changes

### Added

- **WebAudio phoneme engine** (`src/audio/PhonemeEngine.ts`): Preloads audio clips as AudioBuffers, supports playbackRate manipulation for issue #6
- **Tap-to-Start gate** (`src/components/TapToStartGate.ts`): Full-screen overlay ensuring user gesture before audio playback (iOS/Android autoplay compliance)
- **Phoneme manifest types** (`src/types/phoneme-manifest.ts`): TypeScript types for manifest-driven lesson configuration
- **Phoneme grid component** (`src/components/PhonemeGrid.ts`): Responsive grid layout for phoneme tiles
- **Phoneme tile component** (`src/components/PhonemeTile.ts`): Interactive button with visual feedback (80x80px min touch target)
- **Lesson page** (`src/lesson.ts`): Main entry point integrating gate, grid, and audio engine
- **Placeholder generator** (`scripts/generate-placeholders.mjs`): Programmatic WAV synthesis for 22 phoneme clips
- **Phoneme manifest** (`public/manifest/phoneme-manifest.json`): 8 CVC words with 2-pass structure (onset+rim, onset+vowel+coda)
- **22 placeholder WAV files** (`public/phonemes/`): Synthetic audio clips (plosives, fricatives, nasals, vowels, liquid, rims)
- **Lesson styles** (`src/styles/lesson.css`): Tablet-first responsive layout
- **Comprehensive test suite**: 29 Vitest tests covering engine, manifest, components, and integration

### Changed

- **main.ts**: Simplified to initialize LessonBridge and render lesson page
- **index.html**: Added stylesheet link for lesson styles

### Technical Decisions

1. **Manifest-driven design**: Single source of truth for word definitions and clip inventory
2. **Synthetic placeholders**: Programmatic audio generation for development (replaceable with real TTS)
3. **Lazy AudioContext**: No audio context created until user interaction
4. **Source tracking**: Active AudioBufferSourceNodes tracked for cleanup
5. **Swedish content**: All UI text in Swedish ("Tryck för att starta", "Omgång 1 av 2", etc.)

## Testing

### Automated Tests

```bash
cd apps/lessons/phonics-cvc
pnpm vitest run
```

**Results:** 29 tests pass across 5 test files
- PhonemeEngine: 11 tests (load, play, playbackRate, stop, destroy)
- PhonemeManifest: 10 tests (structure validation, file existence)
- PhonemeTile: 3 tests (visual feedback, touch handling)
- TapToStartGate: 3 tests (overlay creation, tap handling)
- Main integration: 2 tests

### Manual Verification

1. **Start dev server:**
   ```bash
   cd apps/lessons/phonics-cvc
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:5174`

3. **Verify Tap-to-Start:**
   - Overlay appears with "Tryck för att starta" button
   - No audio plays before tap
   - After tap, overlay disappears, lesson renders

4. **Verify phoneme playback:**
   - Tap each phoneme tile
   - Audio plays immediately (low latency)
   - Visual feedback (button scales to 0.95)

5. **Verify two-pass structure:**
   - Pass 1: 2 tiles (onset + rim)
   - Click "Nästa" → Pass 2: 3 tiles (onset + vowel + coda)

6. **Verify navigation:**
   - "Föregående" disabled on first word
   - "Nästa" advances pass, then word

7. **Verify LessonBridge:**
   - Bridge initialized with `HUB_ORIGIN`
   - No errors in console

## Screenshots

N/A — Visual UI best verified live in browser.

## Migration Notes

### For Developers

- **No breaking changes**: This is a new lesson app
- **Origin configuration**: Hub must be on port 5173, lesson on 5174 (see `src/config.ts`)
- **Asset pipeline**: Run `node scripts/generate-placeholders.mjs` once to regenerate placeholder WAVs if needed

### For Future TTS Replacement

To replace synthetic placeholders with real recordings:

1. Record/obtain high-quality mono 44.1kHz WAV files
2. Trim carefully (remove schwa tails from stop consonants)
3. Drop files into `public/phonemes/` (same filenames)
4. No manifest changes needed if clip names match

See `public/phonemes/README.md` for detailed pipeline.

## Related Issues

- **Issue #5**: Phonics CVC lesson implementation (this PR)
- **Issue #6**: Sound glider mechanic + playbackRate integration (next)
- **Issue #4**: Hub implementation with lesson grid (completed)
- **Issue #3**: LessonBridge postMessage protocol (completed)

## Checklist

- [x] Code builds without errors
- [x] All 29 tests pass
- [x] TypeScript type checking passes
- [x] ESLint clean
- [x] ADR created (docs/adr/005-phoneme-engine.md)
- [x] Swedish content reviewed
- [x] Touch targets meet 80x80px minimum
- [x] Tap-to-Start gate prevents autoplay violations