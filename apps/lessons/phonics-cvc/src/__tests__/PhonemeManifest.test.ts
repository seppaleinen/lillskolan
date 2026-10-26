import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '../../public/manifest/phoneme-manifest.json');
const phonemesDir = resolve(__dirname, '../../public/phonemes');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

describe('phoneme-manifest', () => {
  it('has 8 words', () => {
    expect(manifest.words).toHaveLength(8);
  });

  it('each word has required fields', () => {
    for (const word of manifest.words) {
      expect(word).toHaveProperty('id');
      expect(word).toHaveProperty('letters');
      expect(word).toHaveProperty('passes');
      expect(typeof word.id).toBe('string');
      expect(Array.isArray(word.letters)).toBe(true);
      expect(Array.isArray(word.passes)).toBe(true);
    }
  });

  it('each word has exactly 2 passes', () => {
    for (const word of manifest.words) {
      expect(word.passes).toHaveLength(2);
    }
  });

  it('each pass has chunks with text and clip', () => {
    for (const word of manifest.words) {
      for (const pass of word.passes) {
        expect(pass).toHaveProperty('chunks');
        expect(Array.isArray(pass.chunks)).toBe(true);
        expect(pass.chunks.length).toBeGreaterThan(0);
        for (const chunk of pass.chunks) {
          expect(chunk).toHaveProperty('text');
          expect(chunk).toHaveProperty('clip');
          expect(typeof chunk.text).toBe('string');
          expect(typeof chunk.clip).toBe('string');
        }
      }
    }
  });

  it('has 22 unique clips in manifest.clips', () => {
    expect(manifest.clips).toHaveLength(22);
    const unique = new Set(manifest.clips);
    expect(unique.size).toBe(22);
  });

  it('all clips referenced by words exist in manifest.clips', () => {
    const referenced = new Set<string>();
    for (const word of manifest.words) {
      for (const pass of word.passes) {
        for (const chunk of pass.chunks) {
          referenced.add(chunk.clip);
        }
      }
    }
    for (const clip of referenced) {
      expect(manifest.clips).toContain(clip);
    }
  });

  it('pass 1 has 2 chunks (onset + rim), pass 2 has 3 chunks (onset + vowel + coda)', () => {
    for (const word of manifest.words) {
      expect(word.passes[0].chunks).toHaveLength(2);
      expect(word.passes[1].chunks).toHaveLength(3);
    }
  });

  it('every clip file exists in public/phonemes/', () => {
    for (const clip of manifest.clips) {
      const filePath = resolve(phonemesDir, `${clip}.wav`);
      const exists = require('node:fs').existsSync(filePath);
      expect(exists).toBe(true);
    }
  });

  it('words have correct IDs', () => {
    const ids = new Set(manifest.words.map((w: { id: string }) => w.id));
    const expected = new Set(['bil', 'hus', 'man', 'nät', 'sak', 'säl', 'sol', 'tid']);
    expect(ids).toEqual(expected);
  });

  it('version is 1.0.0', () => {
    expect(manifest.version).toBe('1.0.0');
  });
});