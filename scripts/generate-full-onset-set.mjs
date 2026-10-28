#!/usr/bin/env node
/**
 * Generate full onset+vowel matrix using Piper TTS (Swedish Alma voice).
 * Output: 44.1kHz mono 16-bit PCM WAVs to apps/lessons/phonics-cvc/public/phonemes/
 *
 * Run: node scripts/generate-full-onset-set.mjs
 *
 * Requires: piper (in PATH or at ./piper/piper), ffmpeg
 * Voice model: piper-voices/sv_SE-alma-medium.onnx
 */

import { execSync } from 'node:child_process';
import { mkdirSync, unlinkSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'apps/lessons/phonics-cvc/public/phonemes');
const piperModel = join(root, 'piper-voices/sv_SE-alma-medium.onnx');
const piperConfig = join(root, 'piper-voices/sv_SE-alma-medium.onnx.json');
const tmpDir = '/tmp/lillskolan-piper-onset';

// Piper binary location - try local first, then PATH
const piperBin = existsSync(join(root, 'piper/piper'))
  ? join(root, 'piper/piper')
  : 'piper';

mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

// Onset+vowel matrix from espeak-ng sv-se IPA
// Vowels: i (iː), a (ɑː), u (ʉː), ä (ɛː), o (uː)
const onsets = ['b', 'h', 's', 'm', 't', 'n', 'd', 'k'];
const vowels = [
  { letter: 'i', ipa: 'iː' },
  { letter: 'a', ipa: 'ɑː' },
  { letter: 'u', ipa: 'ʉː' },
  { letter: 'ä', ipa: 'ɛː' },
  { letter: 'o', ipa: 'uː' },
];

// Plosives that need trimming (epenthetic schwa tail)
const plosives = new Set(['b', 'd', 't', 'k', 'g']);

// Trim amount for plosives (ms) - removes schwa without clipping burst
const PLOSIVE_TRIM_MS = 70;

// Fade-out at end (ms) for smooth cutoff
const FADE_OUT_MS = 5;

console.log(`\n🎙️  Generating full onset+vowel matrix with Piper TTS (Alma voice)`);
console.log(`   Model: ${piperModel}`);
console.log(`   Output: ${outDir}`);
console.log(`   Combinations: ${onsets.length} onsets × ${vowels.length} vowels = ${onsets.length * vowels.length} clips\n`);

// Build the full matrix
const matrix = [];
for (const onset of onsets) {
  for (const vowel of vowels) {
    const clipId = `${onset}_${vowel.letter}`;
    const ipaText = `${onset}${vowel.ipa}`;
    matrix.push({ onset, vowel: vowel.letter, ipa: vowel.ipa, clipId, ipaText });
  }
}

// Piper TTS settings from model config (noise_scale: 0.8, length_scale: 0.9, noise_w: 0.6)
const piperArgs = [
  `-m "${piperModel}"`,
  `-c "${piperConfig}"`,
  `--noise_scale 0.8`,
  `--length_scale 0.9`,
  `--noise_w 0.6`,
  `--sentence_silence 0`,  // No extra silence between sentences
].join(' ');

async function generateClip(clipId, ipaText) {
  const rawWav = join(tmpDir, `${clipId}_raw.wav`);
  const outWav = join(outDir, `${clipId}.wav`);

  try {
    // Generate WAV with Piper (outputs at model's native 22050 Hz)
    const piperCmd = `echo "${ipaText}" | ${piperBin} ${piperArgs} -f "${rawWav}"`;
    execSync(piperCmd, { stdio: 'ignore', timeout: 30000 });

    // Convert to 44.1kHz mono 16-bit PCM using ffmpeg
    // Apply trim + fade for plosives
    let ffmpegFilter = 'aresample=44100,highpass=f=20';  // Resample + remove DC offset
    
    if (plosives.has(clipId.split('_')[0])) {
      // Get duration first to calculate trim point
      const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${rawWav}"`;
      const durationSec = parseFloat(execSync(probeCmd, { encoding: 'utf8' }).trim());
      const durationMs = durationSec * 1000;
      const trimStart = Math.max(0, durationMs - PLOSIVE_TRIM_MS - FADE_OUT_MS);
      
      // Trim from trimStart to end, with fade-out
      ffmpegFilter += `,atrim=start=${trimStart/1000},afade=t=out:st=${(durationMs - FADE_OUT_MS)/1000}:d=${FADE_OUT_MS/1000}`;
    }

    const ffmpegCmd = `ffmpeg -y -i "${rawWav}" -af "${ffmpegFilter}" -ar 44100 -ac 1 -sample_fmt s16 "${outWav}"`;
    execSync(ffmpegCmd, { stdio: 'ignore', timeout: 30000 });

    // Verify output
    const stats = statSync(outWav);
    const durationSec = (stats.size - 44) / (44100 * 2); // mono 16-bit = 2 bytes/sample

    // Quick validation
    if (durationSec <= 0.01) {
      throw new Error(`Clip too short: ${durationSec.toFixed(3)}s`);
    }

    console.log(`✅ ${clipId.padEnd(6)} (${ipaText.padEnd(6)}) → ${stats.size.toString().padStart(6)} bytes (${durationSec.toFixed(3)}s)`);

    // Cleanup temp
    unlinkSync(rawWav);

    return { clipId, ipaText, ok: true, size: stats.size, duration: durationSec };
  } catch (err) {
    console.error(`❌ ${clipId} (${ipaText}): ${err.message}`);
    try { unlinkSync(rawWav); } catch {}
    try { unlinkSync(outWav); } catch {}
    return { clipId, ipaText, ok: false, error: err.message };
  }
}

async function run() {
  const results = [];
  
  for (const item of matrix) {
    results.push(await generateClip(item.clipId, item.ipaText));
    // Small delay to avoid overloading
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n--- Summary ---');
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log(`Success: ${ok}/${matrix.length}`);
  console.log(`Failed:  ${fail}/${matrix.length}`);

  if (fail > 0) {
    console.log('\nFailed clips:');
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.clipId} (${r.ipaText}): ${r.error}`));
    process.exit(1);
  }

  // Generate manifest update info
  console.log('\n📋 Manifest update needed:');
  console.log('   Add these clip IDs to manifest.clips array:');
  const newClipIds = results.map(r => r.clipId).sort();
  console.log('   ' + newClipIds.join(', '));
  
  console.log('\n   Add onsetContext to PhonemeChunk entries where applicable:');
  console.log('   { "text": "b", "clip": "b_i", "onsetContext": "i" }, etc.');
  
  console.log('\n✅ All onset+vowel clips generated successfully!');
  console.log('   Next: Run node scripts/validate-audio.mjs to verify');
  console.log('   Then: Update phoneme-manifest.json with new clips and onsetContext fields\n');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});