# PR: Piper TTS Context-Dependent Onset Generation (Issue #11)

## Summary

Generates context-dependent onset clips using Piper TTS with the Swedish `sv_SE-alma-medium` voice, replacing synthetic placeholders with coarticulation-aware audio. Adds `b_i.wav`, `b_a.wav`, and `h_u.wav` (44.1 kHz mono 16-bit PCM) to the phoneme library and wires them into the manifest with an optional `onsetContext` field.

## Changes

### Added

- **`scripts/generate-onsets-piper.mjs`** — Node.js generation script that drives Piper TTS via a Python subprocess. Synthesizes IPA phoneme sequences directly through `phonemes_to_ids()` + `phoneme_ids_to_audio()` (bypasses espeak), outputs 22.05 kHz mono float32 WAV, upsamples to 44.1 kHz mono 16-bit PCM via `afconvert`, and validates non-silent output (peak > 1% FS).
- **`piper-voices/sv_SE-alma-medium.onnx`** — Piper TTS voice model (GPL-3.0, 63 MB).
- **`piper-voices/sv_SE-alma-medium.onnx.json`** — Piper TTS voice config (409 lines).
- **3 POC onset clips** at `apps/lessons/phonics-cvc/public/phonemes/`:

  | Clip | IPA | Context | Example Word |
  |------|-----|---------|--------------|
  | `b_i.wav` | `b iː` | bil | b_iː |
  | `b_a.wav` | `b ɑː` | bak | b_ɑː |
  | `h_u.wav` | `h ʉː` | hus | h_ʉː |

- **`onsetContext?: string` field** on `PhonemeChunk` in `src/types/phoneme-manifest.ts` — marks a chunk's clip as a context-specific onset variant (e.g., `"i"` for `b_i`). Documentation-only; the engine does not read it today.

### Changed

- **`public/manifest/phoneme-manifest.json`** — `clips` array now lists 25 unique clip IDs (22 base + 3 onset variants: `b_i`, `b_a`, `h_u`).
- **`apps/lessons/phonics-cvc/public/phonemes/README.md`** — Added Piper TTS workflow section with prerequisites, generation steps, hand-trim instructions, IPA reference table, and licensing.
- **`docs/changelog.md`** — Added Issue #11 entry under Unreleased.

### Technical Decisions

1. **Piper TTS over cloud TTS** — Local, open-source, CPU-only, no API keys or network dependency. Swedish Alma voice models coarticulation naturally.
2. **Direct IPA phoneme synthesis** — Bypasses espeak phonemizer by passing IPA sequences directly to `phonemes_to_ids()`, giving precise control over stress and length markers.
3. **`onsetContext` as documentation-only field** — Backward-compatible: existing manifests and clips work unchanged. The field prepares the manifest structure for future context-dependent selection logic in the engine.
4. **`afconvert` for upsampling** — Piper native 22.05 kHz output is upsampled to 44.1 kHz mono 16-bit PCM via macOS built-in `afconvert`, matching the existing clip format.

## Testing

### Automated Tests

```bash
cd apps/lessons/phonics-cvc
pnpm vitest run
```

**Results:** 122/122 Vitest tests pass, including the updated `PhonemeManifest.test.ts` which now asserts 25 unique clips and that every clip file exists in `public/phonemes/`.

### Manual Verification

1. **Run generation script:**
   ```bash
   # Prerequisites: python3 -m venv .venv && .venv/bin/pip install piper-tts
   node scripts/generate-onsets-piper.mjs
   ```
   Output confirms all 3 clips generated, upsampled, and non-silent.

2. **Hand-trim in Audacity (required):**
   - Open `b_i.wav`, `b_a.wav`, `h_u.wav`
   - Identify consonant burst + formant transition
   - Trim trailing vowel (steady-state region after transition)
   - Export as WAV 44.1 kHz mono 16-bit PCM
   - Target duration: ~0.1–0.2s

3. **Verify manifest integrity:**
   - `manifest.clips` contains `b_i`, `b_a`, `h_u`
   - All 25 clip files exist in `public/phonemes/`

## Breaking Changes

None. All changes are backward compatible:
- The `onsetContext` field is optional; legacy manifests that omit it still type-check and run unchanged.
- Existing 22 clips and all 8 words work exactly as before.
- No engine, bridge, or component code was modified.

## Licensing

- **Piper TTS**: MIT
- **sv_SE-alma-medium**: GPL-3.0 (model) + CC-BY 4.0 (training data — Alma voice by Yeagersthlm)
- Generated clips inherit **GPL-3.0 / CC-BY 4.0** — suitable for educational use with attribution.

## Related Issues

- **Issue #11** — Piper TTS context-dependent onset generation (this PR)
- **Issue #5** — Phonics CVC lesson implementation (completed)
- **Issue #12** — Audio playback UX improvements (completed)
- **ADR 0008** — Manifest onset context (docs/adr/0008-manifest-onset-context.md)

## Checklist

- [x] Code builds without errors
- [x] All 122 tests pass
- [x] TypeScript type checking passes
- [x] ESLint clean
- [x] ADR 0008 created documenting manifest onset context decision
- [x] README updated with Piper TTS workflow
- [x] Changelog updated
- [x] Security review passed — no new network surface, static assets only
- [x] Manual verification: clips generated, non-silent, manifest wired