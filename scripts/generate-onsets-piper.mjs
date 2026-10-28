#!/usr/bin/env node
/**
 * Generate context-dependent onset clips using Piper TTS (sv_SE-alma-medium).
 *
 * Pipeline:
 *   1. Piper synthesizes IPA phoneme sequences → 22.05kHz mono float32 WAV
 *   2. afconvert upsamples to 44.1kHz mono 16-bit PCM
 *   3. Output → apps/lessons/phonics-cvc/public/phonemes/
 *
 * Each clip is "onset consonant + stressed long vowel" (e.g., b + iː → b_i).
 * Trailing schwa must be hand-trimmed after generation.
 *
 * Prerequisites:
 *   - Python 3.14+ venv with piper-tts: `python3 -m venv .venv && .venv/bin/pip install piper-tts`
 *   - Alma voice: `piper-voices/sv_SE-alma-medium.onnx` + `.onnx.json`
 *   - macOS afconvert (built-in)
 *
 * Run: node scripts/generate-onsets-piper.mjs
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = join(root, 'apps/lessons/phonics-cvc/public/phonemes');
const tmpDir = '/tmp/lillskolan-piper-onsets';
const venvPython = join(root, '.venv', 'bin', 'python');
const voiceDir = join(root, 'piper-voices');
const voiceModel = join(voiceDir, 'sv_SE-alma-medium.onnx');
const voiceConfig = join(voiceDir, 'sv_SE-alma-medium.onnx.json');

mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

// ── Onset clip definitions ────────────────────────────────────────────────
//
// IPA mapping (Piper/espeak phoneme IDs):
//   b  = U+0062 (15)   h = U+0068 (20)
//   i  = U+0069 (21)   ɑ = U+0251 (51)   ʉ = U+0289 (99)
//   ˈ  = U+02C8 (120)  primary stress
//   ː  = U+02D0 (122)  length marker
//
// Piper phonemize() does NOT pass SSML through — it literal-reads the tags.
// Instead we pass the IPA sequence directly via phonemes_to_ids() +
// phoneme_ids_to_audio(), bypassing the phonemizer entirely.

const clips = [
  { id: 'b_i', ipa: ['b', 'ˈ', 'i', 'ː'], desc: 'b + iː (as in "bil")' },
  { id: 'b_a', ipa: ['b', 'ˈ', 'ɑ', 'ː'], desc: 'b + ɑː (as in "bak")' },
  { id: 'h_u', ipa: ['h', 'ˈ', 'ʉ', 'ː'], desc: 'h + ʉː (as in "hus")' },
];

// ── Python TTS generation ─────────────────────────────────────────────────

const PIPER_SCRIPT = `
import sys, os, json, wave, numpy as np
from piper import PiperVoice

tmp_dir = r'${tmpDir}'
voice_model = r'${voiceModel}'
voice_config = r'${voiceConfig}'

# Read clip definitions from stdin
clips = json.loads(sys.stdin.read())

voice = PiperVoice.load(voice_model, voice_config)
sr = voice.config.sample_rate  # 22050

results = []
for clip in clips:
    ipa = clip['ipa']
    clip_id = clip['id']

    # Convert IPA to phoneme IDs (bypasses espeak phonemizer)
    ids = voice.phonemes_to_ids(ipa)
    audio = voice.phoneme_ids_to_audio(ids)

    # Save as 22kHz mono float32 WAV
    wav_path = os.path.join(tmp_dir, clip_id + '.wav')
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # We write int16 directly
        wf.setframerate(sr)
        audio_int16 = (audio * 32767).astype(np.int16)
        wf.writeframes(audio_int16.tobytes())

    duration = len(audio) / sr
    peak = float(np.abs(audio).max())
    rms = float(np.sqrt(np.mean(audio ** 2)))

    results.append({
        'id': clip_id,
        'ok': True,
        'wav22': wav_path,
        'duration': round(duration, 3),
        'peak': round(peak, 4),
        'rms': round(rms, 4),
    })

# Output results as JSON to stdout
print(json.dumps(results))
`;

function runPiper() {
  console.log(`\n🎙 Generating ${clips.length} onset clips with Piper TTS (sv_SE-alma-medium)...`);
  console.log(`   Voice model: ${voiceModel}`);
  console.log(`   Sample rate: 22050 Hz (Piper native)`);
  console.log();

  // Verify pre-requisites
  if (!statSync(voiceModel).isFile()) {
    console.error(`❌ Voice model not found: ${voiceModel}`);
    console.error('   Download from: https://huggingface.co/yeagersthlm/piper-voice-sv-alma/');
    process.exit(1);
  }

  const pythonResult = spawnSync(venvPython, ['-c', PIPER_SCRIPT], {
    input: JSON.stringify(clips),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (pythonResult.status !== 0) {
    console.error('❌ Piper synthesis failed:');
    console.error(pythonResult.stderr || pythonResult.stdout);
    process.exit(1);
  }

  return JSON.parse(pythonResult.stdout);
}

// ── Upsample to 44.1kHz ────────────────────────────────────────────────────

function upsampleAndCopy(piperResults) {
  console.log('\n🔊 Upsampling to 44.1kHz mono 16-bit PCM...');

  for (const result of piperResults) {
    const wav44Path = join(outDir, `${result.id}.wav`);
    const cmd = `afconvert "${result.wav22}" "${wav44Path}" -d LEI16@44100 -f WAVE -c 1`;

    try {
      execSync(cmd, { stdio: 'pipe' });

      const stats = statSync(wav44Path);
      const durationSec = (stats.size - 44) / 2 / 44100;

      console.log(`✅ ${result.id.padEnd(6)} → ${stats.size.toString().padStart(7)} bytes (${durationSec.toFixed(3)}s, peak=${result.peak}, rms=${result.rms})`);
    } catch (err) {
      console.error(`❌ ${result.id} upsample failed: ${err.message}`);
    }
  }
}

// ── Silence check ──────────────────────────────────────────────────────────

function checkNonSilent(piperResults) {
  console.log('\n🔍 Verifying clips are non-silent...');
  let allOk = true;

  for (const result of piperResults) {
    const wavPath = join(outDir, `${result.id}.wav`);
    try {
      const buf = readFileSync(wavPath);
      const dataStart = 44; // Standard WAV header
      const samples = new Int16Array(buf.buffer, buf.byteOffset + dataStart, (buf.length - dataStart) / 2);

      let peak = 0;
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
      }

      // Threshold: 1% of full scale (328 out of 32767)
      if (peak < 328) {
        console.error(`⚠️  ${result.id} appears silent (peak=${peak})`);
        allOk = false;
      } else {
        console.log(`✅ ${result.id} peak=${peak} (${(peak / 32767 * 100).toFixed(1)}% FS)`);
      }
    } catch (err) {
      console.error(`❌ ${result.id} check failed: ${err.message}`);
      allOk = false;
    }
  }

  return allOk;
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('=== Piper TTS Onset Clip Generator ===');
console.log(`Output: ${outDir}\n`);

const piperResults = runPiper();
upsampleAndCopy(piperResults);
const valid = checkNonSilent(piperResults);

console.log('\n--- Summary ---');
console.log(`Generated: ${piperResults.length} clips`);
console.log(`All non-silent: ${valid ? '✅' : '❌'}`);

console.log('\n--- Next steps ---');
console.log('1. Listen to each clip in the output directory');
console.log('2. Hand-trim trailing vowel in Audacity if needed:');
console.log('   - Select the trailing vowel region');
console.log('   - Edit → Trim (or Cmd+T)');
console.log('   - Export as WAV 44.1kHz mono 16-bit');
console.log('3. Update manifest: add clip IDs to clips[] array');
console.log('4. Commit changes');
console.log();

if (!valid) {
  process.exit(1);
}
