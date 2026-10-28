/**
 * Phoneme manifest type definitions.
 * Loaded from public/manifest/phoneme-manifest.json
 */

import type { CaseMode } from '../utils/displayCase';

export interface PhonemeChunk {
  /** The phoneme text (e.g., "b", "il") */
  text: string;
  /** The clip identifier (filename without .wav) */
  clip: string;
}

export interface PhonemePass {
  /** Ordered chunks for this pass */
  chunks: PhonemeChunk[];
}

export interface PhonemeWord {
  /** Word identifier (e.g., "bil") */
  id: string;
  /** Individual letters */
  letters: string[];
  /** Two passes: [onset+rim, onset+vowel+coda] */
  passes: PhonemePass[];
}

export interface PhonemeManifest {
  /** Manifest version */
  version: string;
  /** All words in the lesson */
  words: PhonemeWord[];
  /** All unique clip IDs referenced by words */
  clips: string[];
  /** Case mode for progressive introduction: upper → lower → mixed */
  caseMode?: CaseMode;
}