# 0005 Phoneme Engine

Status: Accepted

## Context

The phonics-cvc lesson (issue #5) required an audio playback system for Swedish phoneme clips. The lesson teaches blending through two passes: onset+rim (2 chunks) followed by onset+vowel+coda (3 chunks) across 8 CVC words.

Key requirements:
- No audio before explicit user interaction (iOS/Android autoplay policy lockout)
- Low-latency playback for child-friendly tablet interaction
- Support for playbackRate manipulation (needed for drag mechanic in issue #6)
- Manifest-driven asset pipeline allowing word additions without code changes
- Swedish phoneme inventory: 22 clips (plosives, fricatives, nasals, vowels, liquid, rims)

## Decision

### Manifest-Driven Design

The `PhonemeManifest` type in `src/types/phoneme-manifest.ts` is the single source of truth:

```typescript
interface PhonemeManifest {
  version: string;
  words: PhonemeWord[];
  clips: string[];
}

interface PhonemeWord {
  id: string;
  letters: string[];
  passes: PhonemePass[];
}

interface PhonemePass {
  chunks: PhonemeChunk[];
}
```

Each word has exactly 2 passes:
- Pass 1: 2 chunks (onset + rim), e.g., /b/ + /il/
- Pass 2: 3 chunks (onset + vowel + coda), e.g., /b/ + /i/ + /l/

The manifest at `public/manifest/phoneme-manifest.json` lists all 22 clips. The engine loads exactly what the manifest declares.

### Synthetic Placeholders vs Real TTS

Placeholder clips are generated programmatically via `scripts/generate-placeholders.mjs`:

- **Plosives** (b, d, t, k): filtered noise bursts with rapid decay
- **Fricatives** (s, h): bandpassed noise (s: 4-8kHz, h: 200-800Hz)
- **Nasals** (m, n): low sine (120Hz) + filtered noise mix
- **Vowels** (i, u, a, ä, o): two-formant synthesis with glottal pulse train (F0=120Hz)
- **Liquid** (l): two-formant resonator (F1~500, F2~1200)
- **Rims** (il, us, ak, an, id, ät, äl, ol): formant transition from vowel to coda via crossfade

**Quality note:** These are robotic approximations sufficient for development. Production requires real TTS recordings with manual trimming to remove schwa tails.

### WebAudio Implementation

The `WebAudioPhonemeEngine` class in `src/audio/PhonemeEngine.ts`:

1. **Lazy initialization**: No AudioContext created until first `load()` or `play()`
2. **Preloading**: Fetches all clips as WAV, decodes to AudioBuffers during `load()`
3. **Playback**: Creates `AudioBufferSourceNode` per play, connects to destination, starts immediately
4. **Source tracking**: Active sources tracked in Set for `stop()`/`destroy()` cleanup

### playbackRate Hook for Issue #6

The engine exposes `setPlaybackRate(value)` and `play(clipId, playbackRate?)`:

- Global rate clamped to [0.1, 4.0]
- Per-play override via optional second parameter
- Enables pitch/time manipulation for the drag mechanic (issue #6)

```typescript
setPlaybackRate(value: number): void {
  this.globalRate = Math.min(4, Math.max(0.1, value));
}

play(clipId: string, playbackRate?: number): void {
  const source = ctx.createBufferSource();
  source.playbackRate.value = playbackRate ?? this.globalRate;
  // ...
}
```

### Tap-to-Start Gate

The `createTapToStartGate()` function in `src/components/TapToStartGate.ts`:

- Creates full-screen overlay with "Tryck för att starta" button
- First tap triggers `onStart()` callback (loads audio engine, resumes AudioContext)
- Removes overlay from DOM after tap
- Ensures no WebAudio emission before explicit user gesture

**Why required:** iOS Safari and some Android browsers block AudioContext from starting without user interaction. The gate guarantees a valid user gesture before any audio operations.

## Consequences

### Positive

- **Type-safe manifest**: TypeScript types enforce structure, prevent runtime errors
- **Extensible**: Adding words requires only manifest changes, no code modifications
- **Low latency**: Preloaded AudioBuffers enable instant playback
- **Flexible playback**: playbackRate hook supports future interaction mechanics
- **Autoplay compliant**: Tap-to-Start gate satisfies mobile browser policies
- **Testable**: 29 Vitest tests cover engine, manifest, tiles, and gate

### Negative

- **Placeholder quality**: Synthetic clips are robotic, not production-ready
- **Asset management**: Manual TTS pipeline requires careful trimming (schwa removal)
- **Bundle size**: 22 WAV files (~500KB total) increase initial load

### Follow-up

- Replace placeholders with real TTS recordings (Coqui TTS or equivalent)
- Implement drag mechanic using playbackRate (issue #6)
- Add progress reporting to Hub via LessonBridge (stepIndex/totalSteps)
- Consider lazy-loading clips for larger phoneme inventories
