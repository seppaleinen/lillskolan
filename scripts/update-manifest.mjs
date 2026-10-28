#!/usr/bin/env node
/**
 * Update phoneme-manifest.json with full onset+vowel matrix.
 * Adds new clip IDs and onsetContext fields to PhonemeChunk entries.
 *
 * Run: node scripts/update-manifest.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const manifestPath = join(root, 'apps/lessons/phonics-cvc/public/manifest/phoneme-manifest.json');

// Onset+vowel matrix
const onsets = ['b', 'h', 's', 'm', 't', 'n', 'd', 'k'];
const vowels = ['i', 'a', 'u', 'ä', 'o'];

const newClipIds = [];
for (const onset of onsets) {
  for (const vowel of vowels) {
    newClipIds.push(`${onset}_${vowel}`);
  }
}

// Sort for consistent ordering
newClipIds.sort();

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Add new clip IDs to manifest.clips (avoid duplicates)
const existingClips = new Set(manifest.clips);
for (const clipId of newClipIds) {
  existingClips.add(clipId);
}
manifest.clips = Array.from(existingClips).sort();

// Update PhonemeChunk entries in words to add onsetContext where applicable
// The onsetContext is metadata for tooling - indicates this clip is a context-specific onset variant
function addOnsetContext(chunks) {
  for (const chunk of chunks) {
    // Check if this clip is an onset+vowel combo
    const match = chunk.clip.match(/^([bhsmtndk])_([iauäo])$/);
    if (match) {
      chunk.onsetContext = match[2]; // The vowel letter
    }
  }
}

// Process all words
for (const word of manifest.words) {
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

console.log('✅ Manifest updated:');
console.log(`   Added ${newClipIds.length} new clip IDs to clips array`);
console.log(`   Total clips: ${manifest.clips.length}`);
console.log(`   Added onsetContext to applicable PhonemeChunk entries`);
console.log('\nNew clip IDs:');
console.log('  ' + newClipIds.join(', '));