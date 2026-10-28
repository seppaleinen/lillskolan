import { describe, it, expect } from 'vitest';
import { toDisplayCase, type CaseMode } from './displayCase';

describe('toDisplayCase', () => {
  it('returns empty string for empty input', () => {
    expect(toDisplayCase('', 'upper')).toBe('');
    expect(toDisplayCase('', 'lower')).toBe('');
    expect(toDisplayCase('', 'mixed')).toBe('');
  });

  it('returns the same for undefined mode (defaults to upper)', () => {
    expect(toDisplayCase('bil')).toBe('BIL');
    expect(toDisplayCase('bil', undefined)).toBe('BIL');
  });

  it('uppercases all characters in upper mode', () => {
    expect(toDisplayCase('bil', 'upper')).toBe('BIL');
    expect(toDisplayCase('BIL', 'upper')).toBe('BIL');
    expect(toDisplayCase('Bil', 'upper')).toBe('BIL');
  });

  it('lowercases all characters in lower mode', () => {
    expect(toDisplayCase('bil', 'lower')).toBe('bil');
    expect(toDisplayCase('BIL', 'lower')).toBe('bil');
    expect(toDisplayCase('Bil', 'lower')).toBe('bil');
  });

  it('capitalizes first letter, lowercases rest in mixed mode', () => {
    expect(toDisplayCase('bil', 'mixed')).toBe('Bil');
    expect(toDisplayCase('BIL', 'mixed')).toBe('Bil');
    expect(toDisplayCase('Bil', 'mixed')).toBe('Bil');
  });

  it('handles single character', () => {
    expect(toDisplayCase('b', 'upper')).toBe('B');
    expect(toDisplayCase('b', 'lower')).toBe('b');
    expect(toDisplayCase('b', 'mixed')).toBe('B');
  });

  it('handles special characters like ä', () => {
    expect(toDisplayCase('nät', 'upper')).toBe('NÄT');
    expect(toDisplayCase('NÄT', 'lower')).toBe('nät');
    expect(toDisplayCase('nät', 'mixed')).toBe('Nät');
    expect(toDisplayCase('NÄT', 'mixed')).toBe('Nät');
  });

  it('handles multi-word text', () => {
    expect(toDisplayCase('hello world', 'upper')).toBe('HELLO WORLD');
    expect(toDisplayCase('Hello World', 'lower')).toBe('hello world');
    expect(toDisplayCase('hello world', 'mixed')).toBe('Hello world');
  });

  it('handles already-correct case without corruption', () => {
    expect(toDisplayCase('BIL', 'upper')).toBe('BIL');
    expect(toDisplayCase('bil', 'lower')).toBe('bil');
    expect(toDisplayCase('Bil', 'mixed')).toBe('Bil');
  });

  it('CaseMode type is exported', () => {
    const mode: CaseMode = 'upper';
    expect(mode).toBe('upper');
  });
});