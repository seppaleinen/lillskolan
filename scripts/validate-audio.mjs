#!/usr/bin/env node
/**
 * Validate generated audio clips for CI.
 * Checks: sample rate, channels, bit depth, duration >0, non-silent, format.
 *
 * Run: node scripts/validate-audio.mjs [--clip <clipId>] [--all]
 *
 * Exit codes: 0 = all pass, 1 = validation failed
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const phonemeDir = join(root, 'apps/lessons/phonics-cvc/public/phonemes');

const args = process.argv.slice(2);
const targetClip = args.includes('--clip') ? args[args.indexOf('--clip') + 1] : null;
const checkAll = args.includes('--all') || !targetClip;

function parseWAV(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  // Verify RIFF/WAVE header
  const riff = String.fromCharCode(...buffer.subarray(0, 4));
  if (riff !== 'RIFF') {
    throw new Error('Not a RIFF file');
  }
  
  const wave = String.fromCharCode(...buffer.subarray(8, 12));
  if (wave !== 'WAVE') {
    throw new Error('Not a WAVE file');
  }

  // Find fmt chunk
  let offset = 12;
  let fmtFound = false;
  let sampleRate = 0;
  let numChannels = 0;
  let bitsPerSample = 0;
  let audioFormat = 0;
  
  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(...buffer.subarray(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    
    if (chunkId === 'fmt ') {
      fmtFound = true;
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  
  if (!fmtFound) {
    throw new Error('No fmt chunk found');
  }
  
  // Find data chunk
  offset = 12;
  let dataOffset = 0;
  let dataSize = 0;
  
  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(...buffer.subarray(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    
    if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  
  if (dataSize === 0) {
    throw new Error('No data chunk found or empty');
  }
  
  const audioData = buffer.subarray(dataOffset, dataOffset + dataSize);
  
  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    audioFormat,  // 1 = PCM
    dataSize,
    durationSec: dataSize / (sampleRate * numChannels * bitsPerSample / 8),
    audioData,
  };
}

function checkSilence(audioData, bitsPerSample, threshold = 0.001) {
  if (bitsPerSample === 16) {
    const view = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);
    const sampleCount = audioData.byteLength / 2;
    let maxAmplitude = 0;
    let sumSquares = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const sample = view.getInt16(i * 2, true) / 32768.0; // Normalize to [-1, 1]
      const absSample = Math.abs(sample);
      maxAmplitude = Math.max(maxAmplitude, absSample);
      sumSquares += sample * sample;
    }
    
    const rms = Math.sqrt(sumSquares / sampleCount);
    return { maxAmplitude, rms, isSilent: rms < threshold };
  }
  return { maxAmplitude: 0, rms: 0, isSilent: true };
}

function validateClip(clipId) {
  const path = join(phonemeDir, `${clipId}.wav`);
  
  try {
    const fileBuffer = readFileSync(path);
    const stats = statSync(path);
    const info = parseWAV(fileBuffer);
    const silence = checkSilence(info.audioData, info.bitsPerSample);
    
    const errors = [];
    const warnings = [];
    
    // Required format checks
    if (info.sampleRate !== 44100) {
      errors.push(`Sample rate: ${info.sampleRate} Hz (expected 44100)`);
    }
    if (info.numChannels !== 1) {
      errors.push(`Channels: ${info.numChannels} (expected 1 - mono)`);
    }
    if (info.bitsPerSample !== 16) {
      errors.push(`Bit depth: ${info.bitsPerSample} (expected 16)`);
    }
    if (info.audioFormat !== 1) {
      errors.push(`Audio format: ${info.audioFormat} (expected 1 - PCM)`);
    }
    if (info.durationSec <= 0.01) {
      errors.push(`Duration: ${info.durationSec.toFixed(3)}s (too short, min 0.01s)`);
    }
    if (silence.isSilent) {
      errors.push(`Audio is silent (RMS: ${silence.rms.toFixed(6)})`);
    }
    
    // Warnings
    if (info.durationSec > 2.0) {
      warnings.push(`Duration: ${info.durationSec.toFixed(3)}s (unusually long)`);
    }
    if (silence.maxAmplitude < 0.01) {
      warnings.push(`Very low amplitude: ${silence.maxAmplitude.toFixed(4)}`);
    }
    if (stats.size < 1000) {
      warnings.push(`File size: ${stats.size} bytes (very small)`);
    }
    
    return {
      clipId,
      path,
      ok: errors.length === 0,
      errors,
      warnings,
      info: {
        sampleRate: info.sampleRate,
        channels: info.numChannels,
        bitDepth: info.bitsPerSample,
        format: info.audioFormat === 1 ? 'PCM' : `Unknown(${info.audioFormat})`,
        duration: info.durationSec,
        fileSize: stats.size,
        maxAmplitude: silence.maxAmplitude,
        rms: silence.rms,
      },
    };
  } catch (err) {
    return {
      clipId,
      path,
      ok: false,
      errors: [err.message],
      warnings: [],
      info: null,
    };
  }
}

function printResult(result) {
  const status = result.ok ? '✅' : '❌';
  const info = result.info;
  
  console.log(`${status} ${result.clipId}`);
  
  if (info) {
    console.log(`    Format: ${info.format}, ${info.sampleRate}Hz, ${info.channels}ch, ${info.bitDepth}-bit`);
    console.log(`    Duration: ${info.duration.toFixed(3)}s, Size: ${info.fileSize} bytes`);
    console.log(`    Amplitude: max=${info.maxAmplitude.toFixed(4)}, RMS=${info.rms.toFixed(6)}`);
  }
  
  for (const err of result.errors) {
    console.log(`    ❌ ${err}`);
  }
  for (const warn of result.warnings) {
    console.log(`    ⚠️  ${warn}`);
  }
}

async function run() {
  let clips;
  
  if (targetClip) {
    clips = [targetClip];
  } else if (checkAll) {
    // Get all .wav files in phoneme directory
    clips = readdirSync(phonemeDir)
      .filter(f => f.endsWith('.wav'))
      .map(f => f.slice(0, -4))
      .sort();
  }
  
  if (!clips || clips.length === 0) {
    console.error('No clips to validate');
    process.exit(1);
  }
  
  console.log(`\n🔍 Validating ${clips.length} audio clip(s)...\n`);
  
  const results = clips.map(validateClip);
  results.forEach(printResult);
  
  console.log('\n--- Summary ---');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const withWarnings = results.filter(r => r.ok && r.warnings.length > 0).length;
  
  console.log(`Passed:     ${passed}/${results.length}`);
  console.log(`Failed:     ${failed}/${results.length}`);
  console.log(`Warnings:   ${withWarnings}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Validation FAILED');
    process.exit(1);
  }
  
  if (withWarnings > 0) {
    console.log('\n⚠️  Validation PASSED with warnings');
  } else {
    console.log('\n✅ All clips PASSED validation');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});