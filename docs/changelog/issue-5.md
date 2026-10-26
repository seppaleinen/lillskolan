## [Unreleased] - Phonics CVC Lesson

### Added

- **Phonics CVC lesson** (`apps/lessons/phonics-cvc/`) - tablet-first Swedish early literacy lesson for onset+rim and onset+vowel+coda blending
- **WebAudio phoneme engine** - preloads 22 phoneme clips as AudioBuffers, supports playbackRate for drag mechanic (issue #6)
- **Tap-to-Start gate** - ensures user gesture before audio context initialization (iOS/Android autoplay compliance)
- **Manifest-driven asset pipeline** - single-source-of-truth JSON manifest defines words, passes, and clip inventory
- **Phoneme components** - PhonemeGrid (responsive layout), PhonemeTile (80x80px touch targets with visual feedback)
- **Placeholder audio generator** (`scripts/generate-placeholders.mjs`) - programmatic WAV synthesis for all 22 clips
- **22 synthetic phoneme clips** - plosives, fricatives, nasals, vowels, liquid, rims in `public/phonemes/`
- **Phoneme manifest** (`public/manifest/phoneme-manifest.json`) - 8 CVC words (bil, hus, sak, man, tid, nät, säl, sol) with 2-pass structure
- **LessonBridge integration** - initialized with `HUB_ORIGIN`, ready for progress reporting
- **Comprehensive test suite** - 29 Vitest tests covering engine, manifest, components, and integration

### Changed

- **main.ts** - simplified to initialize LessonBridge and render lesson page (removed demo progress simulation)

### Fixed

- None

### Removed

- None