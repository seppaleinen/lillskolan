# 0008 Manifest Onset Context

Status: Accepted

## Context

Swedish phonics pedagogy requires coarticulation-aware onset pronunciation. In Swedish, the articulation of an onset consonant changes depending on the following vowel (e.g., /b/ before /i/ vs /b/ before /a/). The current phoneme engine uses a single clip per onset (e.g., `b.wav`) for all contexts, producing unnatural robotic speech that hinders learning.

Real TTS-generated onset clips need to be context-dependent: `b_i.wav`, `b_a.wav`, `h_u.wav`, etc. This requires the manifest to declare which context each onset clip targets, so the engine can select the correct variant at playback time.

## Decision

Add an optional `onsetContext?: string` field to the `PhonemeChunk` interface in `src/types/phoneme-manifest.ts`:

```typescript
interface PhonemeChunk {
  id: string;
  type: "onset" | "vowel" | "coda" | "rim";
  onsetContext?: string; // e.g., "i", "a", "u"
}
```

- Field is **documentation-only** — the engine never reads it today
- Existing 22 clips remain as fallback (no manifest JSON changes yet)
- Documented in `public/phonemes/README.md` as "Ready but Unused"

## Consequences

### Positive

- **Backward-compatible**: All existing words, passes, and clips work unchanged
- **Zero runtime impact**: No engine, bridge, or component code modified
- **Future-proof**: Manifest structure ready when context-dependent TTS clips are produced
- **Type-safe**: TypeScript enforces field presence when clips are added

### Negative

- **Unused field**: Adds cognitive overhead until clips exist
- **Manual sync**: Manifest `onsetContext` values must match actual clip filenames when generated

### Follow-up

- Generate context-dependent TTS onset clips (e.g., `b_i.wav`, `b_a.wav`)
- Update engine to select clip by `id + onsetContext` when available, fallback to base `id`
- Add integration tests for context-dependent selection