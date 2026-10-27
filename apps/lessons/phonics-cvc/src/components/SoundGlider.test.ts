import { describe, it, expect } from 'vitest';
import { createSoundGlider } from '../components/SoundGlider';
import type { PhonemeChunk } from '../types/phoneme-manifest';

const pass1: PhonemeChunk[] = [
  { text: 'b', clip: 'b' },
  { text: 'il', clip: 'il' },
];

const pass2: PhonemeChunk[] = [
  { text: 'b', clip: 'b' },
  { text: 'i', clip: 'i' },
  { text: 'l', clip: 'l' },
];

describe('createSoundGlider', () => {
  it('creates one slot per chunk', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slots = glider.element.querySelectorAll('[data-slot-index]');
    expect(slots).toHaveLength(2);
  });

  it('container has class sound-glider', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    expect(glider.element.classList.contains('sound-glider')).toBe(true);
  });

  it('slots have class glider-slot', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slots = glider.element.querySelectorAll('.glider-slot');
    expect(slots).toHaveLength(2);
  });

  it('slots have min 88×88px', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slot = glider.element.querySelector<HTMLElement>('[data-slot-index="0"]')!;
    expect(slot.style.minWidth).toBe('88px');
    expect(slot.style.minHeight).toBe('88px');
  });

  it('renderStep re-renders for 2→3 slots', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    expect(glider.element.querySelectorAll('[data-slot-index]').length).toBe(2);

    glider.renderStep(pass2);
    expect(glider.element.querySelectorAll('[data-slot-index]').length).toBe(3);
  });

  it('markSlotFilled sets filled class and text', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slot = glider.element.querySelector<HTMLElement>('[data-slot-index="0"]')!;

    glider.markSlotFilled(0, pass1[0]);
    expect(slot.classList.contains('filled')).toBe(true);
    expect(slot.textContent).toBe('b');
    expect(slot.style.borderStyle).toBe('solid');
    // jsdom normalizes #4a90d9 to rgb(74, 144, 217) in style.background
    expect(slot.style.background).toBe('rgb(74, 144, 217)');
  });

  it('setActiveSlot toggles active class', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slot0 = glider.element.querySelector<HTMLElement>('[data-slot-index="0"]')!;
    const slot1 = glider.element.querySelector<HTMLElement>('[data-slot-index="1"]')!;

    glider.setActiveSlot(0);
    expect(slot0.classList.contains('active')).toBe(true);
    expect(slot1.classList.contains('active')).toBe(false);

    glider.setActiveSlot(1);
    expect(slot0.classList.contains('active')).toBe(false);
    expect(slot1.classList.contains('active')).toBe(true);

    glider.setActiveSlot(null);
    expect(slot0.classList.contains('active')).toBe(false);
    expect(slot1.classList.contains('active')).toBe(false);
  });

  it('setLocked reduces opacity', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    const slot = glider.element.querySelector<HTMLElement>('[data-slot-index="0"]')!;

    glider.setLocked(true);
    expect(slot.style.opacity).toBe('0.6');

    glider.setLocked(false);
    expect(slot.style.opacity).toBe('1');
  });

  it('destroy() clears slots', () => {
    const handlers = { onDrop: () => {} };
    const glider = createSoundGlider(pass1, handlers);
    glider.destroy();
    expect(glider.element.querySelectorAll('[data-slot-index]').length).toBe(0);
  });
});