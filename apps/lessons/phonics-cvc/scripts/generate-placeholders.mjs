#!/usr/bin/env node
/**
 * Generate placeholder WAV files for phoneme clips.
 * Run once, commit files. Do NOT run in CI.
 * Outputs 22 mono 44.1kHz 16-bit PCM WAV files to public/phonemes/
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'phonemes');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const SR = 44100; // sample rate

// ============================================
// Helpers
// ============================================

function whiteNoise(length) {
  const a = new Float32Array(length);
  for (let i = 0; i < length; i++) a[i] = Math.random() * 2 - 1;
  return a;
}

function applyBiquad(input, b, a) {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = b[0]*x0 + b[1]*x1 + b[2]*x2 - a[1]*y1 - a[2]*y2;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

// Resonator (complex pole pair) for formants
function resonator(F, BW, sr) {
  const w0 = 2 * Math.PI * F / sr;
  const r = Math.exp(-Math.PI * BW / sr);
  const b0 = 1 - r;
  const a1 = 2 * r * Math.cos(w0);
  const a2 = -r * r;
  return { b: [b0, 0, 0], a: [1, a1, a2] };
}

// Biquad lowpass (Butterworth-ish)
function biquadLowpass(F, sr, Q = 0.707) {
  const w0 = 2 * Math.PI * F / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { b: [b0/a0, b1/a0, b2/a0], a: [1, a1/a0, a2/a0] };
}

// Biquad highpass
function biquadHighpass(F, sr, Q = 0.707) {
  const w0 = 2 * Math.PI * F / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 + cosw0) / 2;
  const b1 = -(1 + cosw0);
  const b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { b: [b0/a0, b1/a0, b2/a0], a: [1, a1/a0, a2/a0] };
}

// Bandpass via lowpass + highpass cascade
function bandpass(input, lowF, highF, sr) {
  let out = input;
  if (highF) {
    const lp = biquadLowpass(highF, sr);
    out = applyBiquad(out, lp.b, lp.a);
  }
  if (lowF) {
    const hp = biquadHighpass(lowF, sr);
    out = applyBiquad(out, hp.b, hp.a);
  }
  return out;
}

// Envelope functions
function attackReleaseEnv(length, sr, attack = 0.005, release = 0.02) {
  const env = new Float32Array(length);
  const attackN = Math.floor(attack * sr);
  const releaseN = Math.floor(release * sr);
  for (let i = 0; i < length; i++) {
    if (i < attackN) env[i] = i / attackN;
    else if (i > length - releaseN) env[i] = (length - i) / releaseN;
    else env[i] = 1;
  }
  return env;
}

function decayEnv(length, sr, tauRatio = 4) {
  const env = new Float32Array(length);
  const tau = length / tauRatio;
  for (let i = 0; i < length; i++) env[i] = Math.exp(-i / tau);
  return env;
}

function pulseTrain(length, sr, F0) {
  const out = new Float32Array(length);
  const period = Math.floor(sr / F0);
  for (let i = 0; i < length; i += period) out[i] = 1;
  return out;
}

// Cascade multiple filters
function cascade(input, filters) {
  let out = input;
  for (const f of filters) {
    out = applyBiquad(out, f.b, f.a);
  }
  return out;
}

// Scale and clamp
function normalize(buffer, max = 0.9) {
  let peak = 0;
  for (const v of buffer) if (Math.abs(v) > peak) peak = Math.abs(v);
  if (peak > max) {
    const scale = max / peak;
    for (let i = 0; i < buffer.length; i++) buffer[i] *= scale;
  }
  return buffer;
}

// ============================================
// WAV encoding (16-bit PCM mono RIFF)
// ============================================
function encodeWAV(floatBuf, sr) {
  const dataLen = floatBuf.length * 2;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataLen, true);

  // Samples
  for (let i = 0; i < floatBuf.length; i++) {
    const s = Math.max(-1, Math.min(1, floatBuf[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Uint8Array(buffer);
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ============================================
// Synthesis functions for each clip type
// ============================================

function makePlosive(clip, duration = 0.35) {
  const len = Math.floor(SR * duration);
  let noise = whiteNoise(len);
  // Spectral tilt: bilabials/alveolars (b, d, t) = lowpass ~3kHz; velars (k) = bandpass 2-8kHz
  if (clip === 'k') {
    noise = bandpass(noise, 2000, 8000, SR);
  } else {
    // b, d, t: lowpass ~3kHz
    const lp = biquadLowpass(3000, SR);
    noise = applyBiquad(noise, lp.b, lp.a);
  }
  const env = decayEnv(len, SR, 3.5); // rapid decay
  for (let i = 0; i < len; i++) noise[i] *= env[i];
  return normalize(noise);
}

function makeFricative(clip, duration = 0.4) {
  const len = Math.floor(SR * duration);
  let noise = whiteNoise(len);
  if (clip === 's') {
    // s: 4-8 kHz
    noise = bandpass(noise, 4000, 8000, SR);
  } else if (clip === 'h') {
    // h: 200-800 Hz
    noise = bandpass(noise, 200, 800, SR);
  }
  const env = attackReleaseEnv(len, SR, 0.005, 0.05);
  for (let i = 0; i < len; i++) noise[i] *= env[i];
  return normalize(noise);
}

function makeNasal(clip, duration = 0.4) {
  const len = Math.floor(SR * duration);
  // Low sine ~120 Hz + filtered noise
  const t = new Float32Array(len);
  for (let i = 0; i < len; i++) t[i] = i / SR;
  const sine = new Float32Array(len);
  for (let i = 0; i < len; i++) sine[i] = Math.sin(2 * Math.PI * 120 * t[i]) * 0.5;

  let noise = whiteNoise(len);
  // m: lower spectral tilt; n: slightly higher
  if (clip === 'm') {
    const lp = biquadLowpass(1500, SR);
    noise = applyBiquad(noise, lp.b, lp.a);
  } else {
    // n
    const lp = biquadLowpass(2500, SR);
    noise = applyBiquad(noise, lp.b, lp.a);
  }
  // Mix sine + noise
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = sine[i] * 0.7 + noise[i] * 0.3;
  const env = attackReleaseEnv(len, SR, 0.01, 0.03);
  for (let i = 0; i < len; i++) out[i] *= env[i];
  return normalize(out);
}

function makeVowel(clip, duration = 0.45) {
  const len = Math.floor(SR * duration);
  // Formant frequencies
  const formants = {
    i:  { F1: 300,  F2: 2300 },
    u:  { F1: 300,  F2: 870  },
    a:  { F1: 730,  F2: 1090 },
    ä:  { F1: 530,  F2: 1800 },
    o:  { F1: 570,  F2: 840  },
  };
  const { F1, F2 } = formants[clip] || { F1: 500, F2: 1500 };

  const pulse = pulseTrain(len, SR, 120); // F0 = 120 Hz
  const f1 = resonator(F1, 100, SR);
  const f2 = resonator(F2, 150, SR);
  let out = cascade(pulse, [f1, f2]);

  const env = attackReleaseEnv(len, SR, 0.01, 0.03);
  for (let i = 0; i < len; i++) out[i] *= env[i];
  return normalize(out);
}

function makeLiquid(clip, duration = 0.4) {
  // l: liquid - two-formant with F1~500, F2~1200
  const len = Math.floor(SR * duration);
  const pulse = pulseTrain(len, SR, 120);
  const f1 = resonator(500, 100, SR);
  const f2 = resonator(1200, 150, SR);
  let out = cascade(pulse, [f1, f2]);
  const env = attackReleaseEnv(len, SR, 0.01, 0.03);
  for (let i = 0; i < len; i++) out[i] *= env[i];
  return normalize(out);
}

// Rim (vowel + coda transition)
function makeRim(clip, duration = 0.5) {
  const len = Math.floor(SR * duration);
  const pulse = pulseTrain(len, SR, 120);

  // Vowel formants (start) and coda targets (end)
  const vowelFormants = {
    i:  { F1: 300,  F2: 2300 },
    u:  { F1: 300,  F2: 870  },
    a:  { F1: 730,  F2: 1090 },
    ä:  { F1: 530,  F2: 1800 },
    o:  { F1: 570,  F2: 840  },
  };
  const codaTargets = {
    l:  { F1: 500, F2: 1200 },  // liquid
    s:  { F1: 500, F2: 7000 },  // sibilant (high F2)
    k:  { F1: 500, F2: 1200 },  // velar
    n:  { F1: 300, F2: 1800 },  // alveolar nasal
    d:  { F1: 500, F2: 1800 },  // alveolar stop
    t:  { F1: 400, F2: 1800 },  // alveolar stop
  };

  const rimMap = {
    il: { vowel: 'i', coda: 'l' },
    us: { vowel: 'u', coda: 's' },
    ak: { vowel: 'a', coda: 'k' },
    an: { vowel: 'a', coda: 'n' },
    id: { vowel: 'i', coda: 'd' },
    ät: { vowel: 'ä', coda: 't' },
    äl: { vowel: 'ä', coda: 'l' },
    ol: { vowel: 'o', coda: 'l' },
  };

  const { vowel, coda } = rimMap[clip] || { vowel: 'a', coda: 'l' };
  const vf = vowelFormants[vowel];
  const ct = codaTargets[coda];

  // Vowel resonator output
  const v_f1 = resonator(vf.F1, 100, SR);
  const v_f2 = resonator(vf.F2, 150, SR);
  const vowelOut = cascade(pulse, [v_f1, v_f2]);

  // Coda resonator output
  const c_f1 = resonator(ct.F1, 100, SR);
  const c_f2 = resonator(ct.F2, 150, SR);
  const codaOut = cascade(pulse, [c_f1, c_f2]);

  // Crossfade from vowel to coda
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const vGain = 1 - t;
    const cGain = t;
    out[i] = vowelOut[i] * vGain + codaOut[i] * cGain;
  }

  // For sibilant coda (us), add high-frequency noise in second half
  if (coda === 's') {
    let noise = whiteNoise(len);
    noise = bandpass(noise, 4000, 8000, SR);
    for (let i = 0; i < len; i++) {
      const t = i / (len - 1);
      if (t > 0.4) out[i] += noise[i] * 0.3 * t;
    }
  }

  const env = attackReleaseEnv(len, SR, 0.01, 0.04);
  for (let i = 0; i < len; i++) out[i] *= env[i];
  return normalize(out);
}

// ============================================
// Dispatch table
// ============================================

const generators = {
  b: () => makePlosive('b'),
  d: () => makePlosive('d'),
  t: () => makePlosive('t'),
  k: () => makePlosive('k'),
  s: () => makeFricative('s'),
  h: () => makeFricative('h'),
  m: () => makeNasal('m'),
  n: () => makeNasal('n'),
  i: () => makeVowel('i'),
  u: () => makeVowel('u'),
  a: () => makeVowel('a'),
  ä: () => makeVowel('ä'),
  o: () => makeVowel('o'),
  l: () => makeLiquid('l'),
  il: () => makeRim('il'),
  us: () => makeRim('us'),
  ak: () => makeRim('ak'),
  an: () => makeRim('an'),
  id: () => makeRim('id'),
  ät: () => makeRim('ät'),
  äl: () => makeRim('äl'),
  ol: () => makeRim('ol'),
};

// ============================================
// Generate all clips
// ============================================
const clips = [
  "b","h","s","m","t","n","d","i","u","a","ä","o","l","k",
  "il","us","ak","an","id","ät","äl","ol"
];

console.log(`Generating ${clips.length} placeholder WAV files to ${outDir}...`);

for (const clip of clips) {
  const generator = generators[clip];
  if (!generator) {
    console.error(`No generator for clip: ${clip}`);
    process.exit(1);
  }
  const audioData = generator();
  const wav = encodeWAV(audioData, SR);
  writeFileSync(join(outDir, `${clip}.wav`), wav);
  console.log(`  ${clip}.wav (${audioData.length} samples, ${(audioData.length / SR).toFixed(2)}s)`);
}

console.log('Done.');