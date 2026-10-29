#!/usr/bin/env node
/**
 * Update phoneme-manifest.json by scanning public/phonemes/*.wav for clip IDs.
 * Infers onsetContext from clip ID pattern (e.g., b_i -> onsetContext: "i").
 * Populates onsetContext field in matching PhonemeChunk entries.
 *
 * Run: node scripts/update-manifest-from-clips.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const manifestPath = join(root, 'apps/lessons/phonics-cvc/public/manifest/phoneme-manifest.json');
const phonemesDir = join(root, 'apps/lessons/phonics-cvc/public/phonemes');

// Scan phonemes directory for .wav files
const wavFiles = readdirSync(phonemesDir).filter(f => f.endsWith('.wav'));
const discoveredClipIds = wavFiles.map(f => f.slice(0, -4)); // remove .wav
discoveredClipIds.sort();

console.log(`Discovered ${discoveredClipIds.length} clip IDs from phonemes directory`);
console.log('  ' + discoveredClipIds.join(', '));

// Pattern for context-dependent onsets: onset_vowel (e.g., b_i, h_u, s_ä)
// Onsets: b, h, s, m, t, n, d, k
// Vowels: i, a, u, ä, o
const onsetContextRegex = /^([bhsmtndk])_([iauäo])$/;

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Add discovered clip IDs to manifest.clips (avoid duplicates)
const existingClips = new Set(manifest.clips);
for (const clipId of discoveredClipIds) {
  existingClips.add(clipId);
}
manifest.clips = Array.from(existingClips).sort();

// Update PhonemeChunk entries in words to add onsetContext where applicable
// The onsetContext is metadata for tooling - indicates this clip is a context-specific onset variant
function addOnsetContext(chunks) {
  for (const chunk of chunks) {
    // Check if this clip is an onset+vowel combo
    const match = chunk.clip.match(onsetContextRegex);
    if (match) {
      chunk.onsetContext = match[2]; // The vowel letter
    }
  }
}

// Replace base onset clips with context-dependent onsets where available
// For each word, if there's a context-dependent onset clip (e.g., b_i for "bil"),
// use it in both passes instead of the base onset clip (b)
function replaceWithContextDependentOnsets(word) {
  // Word letters: [onset, vowel, coda]
  const [onset, vowel] = word.letters;
  const contextClipId = `${onset}_${vowel}`;
  
  // Check if this context-dependent clip exists
  if (!discoveredClipIds.includes(contextClipId)) {
    return; // Not available yet
  }
  
  // Replace in both passes
  for (const pass of word.passes) {
    if (pass.chunks && pass.chunks.length > 0) {
      // First chunk is always the onset
      const onsetChunk = pass.chunks[0];
      if (onsetChunk.clip === onset) {
        onsetChunk.clip = contextClipId;
        onsetChunk.onsetContext = vowel;
      }
    }
  }
}

// Process all words
for (const word of manifest.words) {
  // First, replace base onsets with context-dependent ones where available
  replaceWithContextDependentOnsets(word);
  
  // Then add onsetContext to any chunks that already have context-dependent clip IDs
  for (const pass of word.passes) {
    if (pass.chunks) {
      addOnsetContext(pass.chunks);
    }
    if (pass.distractors) {
      addOnsetContext(pass.distractors);
    }
  }
}

// Write updated manifest
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('\n✅ Manifest updated:');
console.log(`   Total clips in manifest: ${manifest.clips.length}`);
console.log(`   Discovered clip IDs: ${discoveredClipIds.length}`);
console.log(`   Added onsetContext to applicable PhonemeChunk entries`);