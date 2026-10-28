# 0002 Distractor Tiles in Phonics-CVC ChunkTray

Status: Accepted

## Context

The phonics-cvc lesson (issue #5) teaches Swedish CVC word blending through two passes:
- Pass 1: onset + rim (2 chunks, e.g., /b/ + /il/)
- Pass 2: onset + vowel + coda (3 chunks, e.g., /b/ + /i/ + /l/)

Previously, the ChunkTray displayed only the correct chunks for each step in fixed order. This made discrimination too easy — learners could succeed by position rather than phoneme recognition. Issue #16 requested progressive distractor alternatives per lesson step to increase discrimination difficulty.

## Decision

### 1. Manifest-driven distractors

Extended `PhonemePass` in `src/types/phoneme-manifest.ts` with optional `distractors?: PhonemeChunk[]`:

```typescript
interface PhonemePass {
  chunks: PhonemeChunk[];
  distractors?: PhonemeChunk[];
}
```

All 8 pass-1 steps in `public/manifest/phoneme-manifest.json` now carry 2 single-consonant distractors each:
- bil: t, s
- hus: o, a
- sak: t, m
- man: s, t
- tid: s, n
- nät: s, t
- säl: t, n
- sol: t, n

Pass-2 steps intentionally have **no distractors** (baseline, minimal — "Start with minimal distractors (baseline)").

### 2. Engine: TileOption and deterministic shuffle

`lesson-machine.ts` introduces `TileOption { chunk, isDistractor }` and `tileOptionsForStep()`:
- Combines correct chunks + distractors
- Caps at `MAX_TILE_OPTIONS = 6` (correct chunks never dropped by cap)
- Shuffles deterministically via Fisher-Yates with glibc LCG seeded by `stepIndex` (reproducible across reloads)
- Legacy manifests without distractors keep original order (backward compatible)

### 3. Drop validation contract

`DropResult` changed from boolean to discriminated union:
```typescript
type DropResult =
  | { ok: true; slot: number }
  | { ok: false; expected: number; got: number };
```

- Distractor tiles **always rejected** (even in empty slot)
- Correct tile accepted only if it matches the **first empty slot's expected chunk** (text + clip compare)
- Returns the **glider SLOT index** (fill order), not the tray index — critical because tiles are now shuffled

### 4. UI: ChunkTray backward compatible

`ChunkTray.ts` accepts `TileOption[] | PhonemeChunk[]` (backward compatible):
- Normalizes legacy `PhonemeChunk[]` to `TileOption[]` with `isDistractor: false`
- Added `flexWrap + overflowX:auto + maxWidth:100%` so 4–6 tiles adapt without squeezing
- 88×88px touch targets preserved

### 5. Scoring unchanged

`correctDrops`/`incorrectDrops` semantics identical; accuracy/stars computation unaffected.

### 6. No audio or bridge changes

- No audio changes
- No lesson bridge protocol changes

## Consequences

### Positive

- **Progressive difficulty**: Pass 1 introduces phonetic discrimination; Pass 2 remains baseline for confidence building
- **Phonetically plausible distractors**: Single consonants that share features with targets (e.g., bil gets t,s — both plosives) force genuine phoneme recognition
- **Deterministic reproducibility**: LCG seeded by stepIndex ensures same shuffle on reload; enables reliable testing
- **Backward compatible**: Legacy manifests without distractors work unchanged; no migration needed
- **Security**: All rendering via `textContent` — no XSS risk; static manifest, no new network surface
- **Test coverage**: 122/122 Vitest tests pass (13 files), including new distractor tests

### Negative

- **Manifest authoring burden**: Each pass-1 step requires manual distractor selection (mitigated: only 8 steps, pass-2 empty)
- **Slight bundle increase**: Distractor clip IDs reference existing clips; no new audio assets
- **Shuffle complexity**: Deterministic shuffle adds ~30 lines; LCG parameters must remain stable for reproducibility

### Follow-up

- Consider distractor count progression (2 → 3 → 4) in future iterations
- Evaluate whether pass-2 should eventually gain distractors
- Monitor if 6-tile cap needs adjustment for larger inventories