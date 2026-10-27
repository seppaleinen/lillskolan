/**
 * Scoring helpers for the phonics-cvc lesson.
 * Pure functions — no DOM, no audio, no bridge.
 */

/**
 * Clamp a number to the inclusive range [0, 1].
 * Values > 1 clamp to 1; values < 0 clamp to 0.
 */
export function clampAccuracy(a: number): number {
  if (Number.isNaN(a) || !Number.isFinite(a)) {
    return 0;
  }
  if (a < 0) {
    return 0;
  }
  if (a > 1) {
    return 1;
  }
  return a;
}

/**
 * Map average accuracy to a 1-3 star rating.
 * >= 0.85 → 3 stars
 * >= 0.60 → 2 stars
 * otherwise → 1 star (completion floor)
 */
export function computeStars(avgAccuracy: number): number {
  const a = clampAccuracy(avgAccuracy);
  if (a >= 0.85) {
    return 3;
  }
  if (a >= 0.6) {
    return 2;
  }
  return 1;
}