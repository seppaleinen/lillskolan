import { describe, it, expect } from 'vitest';
import { clampAccuracy, computeStars } from './scoring';

describe('clampAccuracy', () => {
  it('clamps negative values to 0', () => {
    expect(clampAccuracy(-1)).toBe(0);
    expect(clampAccuracy(-0.5)).toBe(0);
  });

  it('clamps values > 1 to 1', () => {
    expect(clampAccuracy(1.5)).toBe(1);
    expect(clampAccuracy(2)).toBe(1);
    expect(clampAccuracy(100)).toBe(1);
  });

  it('passes through 0-1 values unchanged', () => {
    expect(clampAccuracy(0)).toBe(0);
    expect(clampAccuracy(0.5)).toBe(0.5);
    expect(clampAccuracy(0.85)).toBe(0.85);
    expect(clampAccuracy(1)).toBe(1);
  });

  it('handles NaN and Infinity as 0', () => {
    expect(clampAccuracy(NaN)).toBe(0);
    expect(clampAccuracy(Infinity)).toBe(0);
    expect(clampAccuracy(-Infinity)).toBe(0);
  });

  it('boundary: 0.29 → 0.29', () => {
    expect(clampAccuracy(0.29)).toBe(0.29);
  });

  it('boundary: 0.59 → 0.59', () => {
    expect(clampAccuracy(0.59)).toBe(0.59);
  });

  it('boundary: 0.84 → 0.84', () => {
    expect(clampAccuracy(0.84)).toBe(0.84);
  });

  it('boundary: 0.85 → 0.85', () => {
    expect(clampAccuracy(0.85)).toBe(0.85);
  });

  it('boundary: 0.60 → 0.60', () => {
    expect(clampAccuracy(0.6)).toBe(0.6);
  });
});

describe('computeStars', () => {
  it('0 → 1 star (completion floor)', () => {
    expect(computeStars(0)).toBe(1);
  });

  it('0.29 → 1 star', () => {
    expect(computeStars(0.29)).toBe(1);
  });

  it('0.59 → 1 star', () => {
    expect(computeStars(0.59)).toBe(1);
  });

  it('0.60 → 2 stars', () => {
    expect(computeStars(0.6)).toBe(2);
  });

  it('0.84 → 2 stars', () => {
    expect(computeStars(0.84)).toBe(2);
  });

  it('0.85 → 3 stars', () => {
    expect(computeStars(0.85)).toBe(3);
  });

  it('1 → 3 stars', () => {
    expect(computeStars(1)).toBe(3);
  });

  it('negative values → 1 star', () => {
    expect(computeStars(-0.5)).toBe(1);
  });

  it('values > 1 → 3 stars', () => {
    expect(computeStars(1.5)).toBe(3);
    expect(computeStars(100)).toBe(3);
  });
});