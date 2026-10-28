# PR: Progressive Distractor Alternatives per Lesson Step (Issue #16)

## Summary

Adds phonetically plausible distractor tiles to the ChunkTray in the phonics-cvc lesson, increasing discrimination difficulty progressively. Pass 1 steps (onset+rim) now show 2 distractor tiles alongside the 2 correct chunks; Pass 2 steps (onset+vowel+coda) remain without distractors as a baseline.

## Changes

### Added

- **Manifest distractors** (`public/manifest/phoneme-manifest.json`) — All 8 pass-1 steps now carry 2 single-consonant distractors each (bil: t,s; hus: o,a; sak: t,m; man: s,t; tid: s,n; nät: s,t; säl: t,n; sol: t,n). Pass-2 steps have no distractors.
- **TileOption type** (`src/state/lesson-machine.ts`) — `{ chunk: PhonemeChunk; isDistractor: boolean }` for mixed correct/distractor tiles.
- **Deterministic shuffle** (`src/state/lesson-machine.ts`) — `tileOptionsForStep()` combines correct + distractors, caps at 6, shuffles via Fisher-Yates with glibc LCG seeded by `stepIndex` (reproducible across reloads). Legacy manifests without distractors keep original order (backward compatible).
- **DropResult contract change** (`src/state/lesson-machine.ts`) — Now `{ ok: true; slot: number } | { ok: false; expected: number; got: number }` so UI marks the correct glider **slot** (fill order), not the tray index — important because tiles are now shuffled.
- **Distractor drop validation** (`src/state/lesson-machine.ts`) — Distractor tiles always rejected (even in empty slot); correct tile accepted only if it matches the first empty slot's expected chunk (text+clip compare).
- **ChunkTray backward compatibility** (`src/components/ChunkTray.ts`) — Accepts `TileOption[] | PhonemeChunk[]`; normalizes legacy input to `isDistractor: false`. Added `flexWrap + overflowX:auto + maxWidth:100%` so 4–6 tiles adapt without squeezing below 88×88px touch targets.

### Changed

- **PhonemePass type** (`src/types/phoneme-manifest.ts`) — Added optional `distractors?: PhonemeChunk[]`.
- **PhonemeChunk type** (`src/types/phoneme-manifest.ts`) — Added optional `isDistractor?: boolean` for runtime metadata.
- **LessonMachine.StepState** (`src/state/lesson-machine.ts`) — Added `tileOptions: TileOption[]` field.
- **Scoring** — Unchanged: `correctDrops`/`incorrectDrops` semantics identical; accuracy/stars unaffected.

### Fixed

- None (feature addition, no bugs fixed).

## Testing

### Automated Tests

```bash
cd apps/lessons/phonics-cvc
pnpm vitest run
```

**Results:** 122/122 Vitest tests pass (13 files), including new tests in `lesson-machine.test.ts` for:
- TileOptions include correct chunks marked non-distractor
- TileOptions include distractors marked as distractor
- TileOptions shuffled deterministically by stepIndex
- Legacy manifest (no distractors) keeps original order, no shuffle
- Distractor tile always rejected even in empty slot
- Correct tile accepted regardless of tray position after shuffle
- dropTile returns the slot index that was filled on success
- Total tile options capped at MAX_TILE_OPTIONS (6), correct chunks never dropped by cap

### Build & Type Check

```bash
pnpm build   # vite build green
pnpm tsc     # no new errors (pre-existing ones unchanged)
```

### Manual Verification

1. **Start dev server:**
   ```bash
   cd apps/lessons/phonics-cvc
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:5174`

3. **Verify Pass 1 distractors:**
   - Step through any Pass 1 word (bil, hus, sak, man, tid, nät, säl, sol)
   - ChunkTray shows 4 tiles (2 correct + 2 distractors) in shuffled order
   - Reload page — same shuffle order (deterministic)

4. **Verify Pass 2 no distractors:**
   - Complete Pass 1, advance to Pass 2
   - ChunkTray shows only 3 correct tiles in original order (no shuffle)

5. **Verify drop behavior:**
   - Drag a distractor tile to an empty slot → rejected, slot remains empty
   - Drag a correct tile to the correct slot → accepted, fills that slot
   - Drag a correct tile to wrong slot → rejected (must match fill order)

6. **Verify responsive tray:**
   - Resize window narrow — tray scrolls horizontally, tiles stay 88×88px

7. **Verify scoring unchanged:**
   - Complete lesson, check stars — accuracy/stars computation unchanged

## Breaking Changes

None. All changes are backward compatible:
- Legacy manifests without `distractors` field work unchanged
- `ChunkTray` accepts old `PhonemeChunk[]` input
- Scoring semantics identical
- No audio changes
- No lesson bridge protocol changes

## Related Issues

- **Issue #16** — Progressive distractor alternatives per lesson step (this PR)
- **Issue #5** — Phonics CVC lesson implementation (completed)
- **Issue #12** — Audio Playback UX improvements (completed)

## Checklist

- [x] Code builds without errors
- [x] All 122 tests pass
- [x] TypeScript type checking passes (no new errors)
- [x] ESLint clean
- [x] ADR 0002 created documenting distractor feature decisions
- [x] Security audit passed — all rendering via textContent, static manifest, no new network surface
- [x] Code review passed
- [x] Manual verification: Pass 1 distractors, Pass 2 baseline, deterministic shuffle, drop validation, responsive tray, scoring unchanged