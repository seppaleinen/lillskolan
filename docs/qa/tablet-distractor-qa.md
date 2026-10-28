# Tablet QA: Progressive Distractor Tiles (Issue #16)

## Overview

This document defines the QA test plan for verifying the progressive distractor tiles feature on physical tablets (iPad and Android). The feature adds 2 distractor tiles to Pass 1 steps (4 tiles total: 2 correct + 2 distractors), while Pass 2 steps remain without distractors (3 correct tiles only).

**Feature:** Issue #16 — Progressive distractor alternatives per lesson step  
**Implementation:** ADR 0002, `docs/pr/issue-16-distractor-tiles.md`  
**Lesson:** Phonics CVC (`apps/lessons/phonics-cvc`)  
**Test Environment:** Physical tablets (iPad Air/mini, Android 10")

---

## Device Matrix

| Device | OS Version | Browser | Screen Size | Status | Notes |
|--------|------------|---------|-------------|--------|-------|
| iPad Air (5th gen) | iPadOS 17+ | Safari | 10.9" | ☐ Pass / ☐ Fail | |
| iPad mini (6th gen) | iPadOS 17+ | Safari | 8.3" | ☐ Pass / ☐ Fail | Compact layout test |
| Android Tablet (Samsung Tab S8) | Android 13+ | Chrome | 11" | ☐ Pass / ☐ Fail | |
| Android Tablet (Lenovo Tab P11) | Android 12+ | Chrome | 10" | ☐ Pass / ☐ Fail | |

**Test Date:** _______________  
**Tester:** _______________  
**Build Version:** _______________

---

## Test Scenarios

### 1. Tile Count per Step

**Goal:** Verify correct tile counts in each pass.

**Steps:**
1. Open phonics-cvc lesson on tablet
2. Start Pass 1 (first word, e.g., "bil")
3. Count tiles in tray at bottom

**Expected:**
- **Pass 1:** 4 tiles visible (2 correct + 2 distractors)
- **Pass 2:** 3 tiles visible (3 correct, no distractors)

**Pass Criteria:**
- ☐ Pass 1 shows exactly 4 tiles
- ☐ Pass 2 shows exactly 3 tiles
- ☐ No tiles overlap or are cut off

**Notes:**
_______________________________________________

---

### 2. Touch Target Size (≥88×88pt)

**Goal:** Verify tiles meet minimum touch target size for accessibility.

**Steps:**
1. Visually inspect tile size relative to finger
2. Attempt to tap tile edges with finger
3. Measure against known reference (e.g., iOS touch target guidelines)

**Expected:**
- Tiles appear large enough for confident touch
- No accidental misses on tile edges
- Visual size matches 88×88pt minimum

**Pass Criteria:**
- ☐ Tiles visually appear ≥88×88pt
- ☐ Touch interaction is reliable on tile edges
- ☐ No accidental adjacent tile activation

**Notes:**
_______________________________________________

---

### 3. Drag Mechanic (8px Threshold, Tile Follows Finger)

**Goal:** Verify drag gesture behavior matches design contract.

**Steps:**
1. Place finger on a tile
2. Move finger ~5px (within threshold)
3. Release
4. Place finger on tile again
5. Move finger >8px (beyond threshold)
6. Observe ghost tile follows finger
7. Drag toward glider slot

**Expected:**
- Movement <8px: no drag starts, tile stays in tray
- Movement >8px: drag ghost appears and follows finger precisely
- Tile under drag shows visual feedback (opacity/transform)
- Ghost tile tracks finger position 1:1

**Pass Criteria:**
- ☐ Small movements (<8px) do not start drag
- ☐ Ghost tile appears after threshold crossed
- ☐ Ghost follows finger position accurately
- ☐ Original tile shows dragging state

**Notes:**
_______________________________________________

---

### 4. Distractor Rejection (Shake on Wrong Drop)

**Goal:** Verify distractor tiles are rejected when dropped into glider slots.

**Steps:**
1. Identify a distractor tile (e.g., "t" or "s" on "bil" step)
2. Drag distractor to an empty glider slot
3. Release over slot
4. Observe slot behavior

**Expected:**
- Slot shakes (visual rejection animation)
- Tile returns to tray
- Slot remains empty
- No progress to next step
- Incorrect drop counter increments (observable via debug if available)

**Pass Criteria:**
- ☐ Distractor tile rejected from empty slot
- ☐ Visual shake feedback on slot
- ☐ Tile returns to original tray position
- ☐ Lesson does not progress

**Notes:**
_______________________________________________

---

### 5. Correct Tile Acceptance (Shuffle-Independent)

**Goal:** Verify correct tiles are accepted regardless of shuffled tray position.

**Steps:**
1. Note shuffled tile order in tray
2. Identify correct tile for first empty slot (e.g., "b" for onset)
3. Drag correct tile to first glider slot
4. Release
5. Observe acceptance

**Expected:**
- Tile snaps into slot
- Tile becomes fixed in glider
- Tile removed from tray (or marked unavailable)
- Progress advances within step

**Pass Criteria:**
- ☐ Correct tile accepted in correct slot
- ☐ Tile snaps into glider slot visually
- ☐ Tray updates (tile removed or dimmed)
- ☐ Acceptance works regardless of tile's shuffled position

**Notes:**
_______________________________________________

---

### 6. Shuffle Determinism (Reload Test)

**Goal:** Verify tile order is reproducible across page reloads.

**Steps:**
1. Note the exact order of 4 tiles in Pass 1, step 1 (e.g., [b, t, il, s])
2. Reload the page (browser refresh or app restart)
3. Navigate to same step (Pass 1, word "bil")
4. Compare tile order

**Expected:**
- Tile order is identical after reload
- Same deterministic shuffle based on step index
- LCG seeding produces reproducible sequence

**Pass Criteria:**
- ☐ Tile order matches before/after reload
- ☐ Shuffle is deterministic per step
- ☐ Different steps have different (but reproducible) shuffles

**Notes:**
_______________________________________________

---

### 7. Layout Adaptation (4–6 Tiles, No Overflow/Overlap)

**Goal:** Verify tray layout adapts to varying tile counts without visual issues.

**Steps:**
1. Observe Pass 1 with 4 tiles
2. Resize browser window (if testing on tablet with split view) or rotate device
3. Check for horizontal scroll if needed
4. Verify no tile overlap or clipping

**Expected:**
- 4 tiles: centered, no scroll needed on standard tablets
- 6 tiles (if cap reached): may scroll horizontally on narrow screens
- Tiles maintain 88×88px minimum size
- No overlap, clipping, or layout breakage
- `flexWrap` and `overflowX:auto` work as designed

**Pass Criteria:**
- ☐ 4 tiles fit without scroll on iPad/Android 10"
- ☐ 6 tiles (if tested) scroll smoothly if needed
- ☐ No tile overlap or visual clipping
- ☐ Layout stable on rotation (portrait ↔ landscape)

**Notes:**
_______________________________________________

---

### 8. Word Display Case Mode (Uppercase Default)

**Goal:** Verify tile text uses correct case mode.

**Steps:**
1. Observe tile text in Pass 1 and Pass 2
2. Check manifest `caseMode` field (should be "upper")
3. Verify all tiles show uppercase text

**Expected:**
- All tiles display uppercase text by default (e.g., "B", "IL")
- Case matches manifest `caseMode: "upper"`
- Swedish characters (ä, ö, å) display correctly in uppercase

**Pass Criteria:**
- ☐ All tiles show uppercase text
- ☐ Swedish characters render correctly (Ä, Ö, Å)
- ☐ Case mode matches manifest setting

**Notes:**
_______________________________________________

---

## Summary

| Scenario | iPad Air | iPad mini | Android S8 | Android P11 |
|----------|----------|-----------|------------|-------------|
| 1. Tile count | ☐ | ☐ | ☐ | ☐ |
| 2. Touch target | ☐ | ☐ | ☐ | ☐ |
| 3. Drag mechanic | ☐ | ☐ | ☐ | ☐ |
| 4. Distractor rejection | ☐ | ☐ | ☐ | ☐ |
| 5. Correct acceptance | ☐ | ☐ | ☐ | ☐ |
| 6. Shuffle determinism | ☐ | ☐ | ☐ | ☐ |
| 7. Layout adaptation | ☐ | ☐ | ☐ | ☐ |
| 8. Case mode | ☐ | ☐ | ☐ | ☐ |

**Overall Status:** ☐ Pass / ☐ Fail

**Critical Issues Found:**
_______________________________________________
_______________________________________________

**Follow-up Actions:**
_______________________________________________
_______________________________________________

---

## Appendix: Technical Reference

### Manifest Structure (Pass 1 with Distractors)

```json
{
  "chunks": [
    { "text": "b", "clip": "b" },
    { "text": "il", "clip": "il" }
  ],
  "distractors": [
    { "text": "t", "clip": "t" },
    { "text": "s", "clip": "s" }
  ]
}
```

### Pass 2 (No Distractors)

```json
{
  "chunks": [
    { "text": "b", "clip": "b" },
    { "text": "i", "clip": "i" },
    { "text": "l", "clip": "l" }
  ]
}
```

### Key Implementation Details

- **Tile cap:** MAX_TILE_OPTIONS = 6 (correct chunks never dropped)
- **Shuffle:** Deterministic LCG seeded by stepIndex (glibc parameters)
- **Touch target:** 88×88px minimum (inline styles in ChunkTray.ts)
- **Drag threshold:** 8px movement before ghost appears
- **Drop validation:** Distractors always rejected; correct tiles checked against first empty slot

### Related Documentation

- ADR 0002: `docs/adr/0002-distractor-tiles-phonics-cvc.md`
- PR Summary: `docs/pr/issue-16-distractor-tiles.md`
- Implementation: `apps/lessons/phonics-cvc/src/state/lesson-machine.ts`, `apps/lessons/phonics-cvc/src/components/ChunkTray.ts`
