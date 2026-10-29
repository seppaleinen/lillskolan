/**
 * Skogslingan mascot configuration and utilities.
 *
 * Swedish encouragement phrases for different lesson contexts.
 * Pure functions, no side effects.
 */

export type MascotPose = 'idle' | 'cheer' | 'celebrate' | 'thinking';

export type MascotPhraseKey =
  | 'stepComplete'
  | 'celebrate'
  | 'thinking'
  | 'encourage';

export interface MascotInstance {
  element: HTMLDivElement;
  setPose(pose: MascotPose): void;
  setSpeech(text: string | null): void;
  destroy(): void;
}

export interface MascotOptions {
  pose?: MascotPose;
  speech?: string | null;
  size?: number;
  className?: string;
}

const MASCOT_NAME = 'Skogslingan';

const MASCOT_PHRASES: Record<MascotPhraseKey, string[]> = {
  stepComplete: [
    'Bra jobbat!',
    'Du klarade det!',
    'Finns inget stopp!',
  ],
  celebrate: [
    'Grattis! Du klarade lektionen!',
    'Fantastiskt!',
    'Mycket bra!',
  ],
  thinking: [
    'Tänk efter…',
    'Kanske den här?',
    'Vilken passar?',
  ],
  encourage: [
    'Du kan!',
    'Fortsätt så!',
    'Bara försök!',
  ],
};

const MASCOT_POSE_MAP: Record<MascotPhraseKey, MascotPose> = {
  stepComplete: 'cheer',
  celebrate: 'celebrate',
  thinking: 'thinking',
  encourage: 'idle',
};

export function pickPhrase(key: MascotPhraseKey): string {
  const phrases = MASCOT_PHRASES[key];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function poseFor(key: MascotPhraseKey): MascotPose {
  return MASCOT_POSE_MAP[key];
}

export { MASCOT_NAME, MASCOT_PHRASES, MASCOT_POSE_MAP };
