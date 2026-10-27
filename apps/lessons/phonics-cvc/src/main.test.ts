import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderLesson, cleanupLesson } from './lesson';

// Mock fetch for manifest loading
const mockFetch = vi.fn();

// Mock AudioContext for jsdom (same pattern as PhonemeEngine.test.ts)
class MockAudioBuffer {
  duration = 0.4;
  sampleRate = 44100;
  numberOfChannels = 1;
  length = 44100 * 0.4;
  getChannelData() {
    return new Float32Array(this.length);
  }
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  playbackRate = { value: 1 };
  connected = false;
  started = false;
  stopped = false;
  onended: (() => void) | null = null;

  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  start() { this.started = true; }
  stop() { this.stopped = true; if (this.onended) this.onended(); }
}

class MockAudioContext {
  sampleRate = 44100;
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination = {};

  async resume() {
    this.state = 'running';
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  createBuffer(_channels: number, length: number, sr: number): MockAudioBuffer {
    const buf = new MockAudioBuffer();
    buf.length = length;
    buf.sampleRate = sr;
    return buf;
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer): Promise<MockAudioBuffer> {
    return new MockAudioBuffer();
  }

  close() {
    this.state = 'closed';
  }
}

function setupFetchMock() {
  // @ts-expect-error - mocking global fetch
  global.fetch = mockFetch;
  // @ts-expect-error - mocking global AudioContext
  global.AudioContext = MockAudioContext;

  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/phonemes/')) {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        version: '1.0.0',
        words: [
          { id: 'bil', letters: ['b', 'i', 'l'], passes: [
            { chunks: [{ text: 'b', clip: 'b' }, { text: 'il', clip: 'il' }] },
            { chunks: [{ text: 'b', clip: 'b' }, { text: 'i', clip: 'i' }, { text: 'l', clip: 'l' }] }
          ]},
          { id: 'hus', letters: ['h', 'u', 's'], passes: [
            { chunks: [{ text: 'h', clip: 'h' }, { text: 'us', clip: 'us' }] },
            { chunks: [{ text: 'h', clip: 'h' }, { text: 'u', clip: 'u' }, { text: 's', clip: 's' }] }
          ]},
          { id: 'sak', letters: ['s', 'a', 'k'], passes: [
            { chunks: [{ text: 's', clip: 's' }, { text: 'ak', clip: 'ak' }] },
            { chunks: [{ text: 's', clip: 's' }, { text: 'a', clip: 'a' }, { text: 'k', clip: 'k' }] }
          ]},
          { id: 'man', letters: ['m', 'a', 'n'], passes: [
            { chunks: [{ text: 'm', clip: 'm' }, { text: 'an', clip: 'an' }] },
            { chunks: [{ text: 'm', clip: 'm' }, { text: 'a', clip: 'a' }, { text: 'n', clip: 'n' }] }
          ]},
          { id: 'tid', letters: ['t', 'i', 'd'], passes: [
            { chunks: [{ text: 't', clip: 't' }, { text: 'id', clip: 'id' }] },
            { chunks: [{ text: 't', clip: 't' }, { text: 'i', clip: 'i' }, { text: 'd', clip: 'd' }] }
          ]},
          { id: 'nät', letters: ['n', 'ä', 't'], passes: [
            { chunks: [{ text: 'n', clip: 'n' }, { text: 'ät', clip: 'ät' }] },
            { chunks: [{ text: 'n', clip: 'n' }, { text: 'ä', clip: 'ä' }, { text: 't', clip: 't' }] }
          ]},
          { id: 'säl', letters: ['s', 'ä', 'l'], passes: [
            { chunks: [{ text: 's', clip: 's' }, { text: 'äl', clip: 'äl' }] },
            { chunks: [{ text: 's', clip: 's' }, { text: 'ä', clip: 'ä' }, { text: 'l', clip: 'l' }] }
          ]},
          { id: 'sol', letters: ['s', 'o', 'l'], passes: [
            { chunks: [{ text: 's', clip: 's' }, { text: 'ol', clip: 'ol' }] },
            { chunks: [{ text: 's', clip: 's' }, { text: 'o', clip: 'o' }, { text: 'l', clip: 'l' }] }
          ]}
        ],
        clips: ['b', 'i', 'l', 'il', 'h', 'u', 's', 'us', 'a', 'k', 'ak', 'm', 'an', 't', 'id', 'n', 'ä', 'ät', 'äl', 'o', 'ol']
      }),
    });
  });
}

function teardownFetchMock() {
  // @ts-expect-error
  delete global.fetch;
  // @ts-expect-error
  delete global.AudioContext;
  vi.restoreAllMocks();
}

describe('main.ts', () => {
  beforeEach(() => {
    setupFetchMock();
  });

  afterEach(() => {
    teardownFetchMock();
  });

  it('renders lesson page into #app container', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById('app');
    expect(app).not.toBeNull();

    if (app) {
      renderLesson(app);
      // Wait for manifest to load and gate to be appended
      await new Promise(resolve => setTimeout(resolve, 10));

      // Lesson should create the tap-to-start gate
      const gate = app.querySelector('div[style*="position: fixed"]');
      expect(gate).not.toBeNull();
      expect(gate?.textContent).toContain('Tryck för att starta');
    }
  });

  it('does not throw when #app is missing', () => {
    document.body.innerHTML = '';
    expect(() => {
      const app = document.getElementById('app');
      if (app) {
        renderLesson(app);
      }
    }).not.toThrow();
  });

  it('after start, shows lesson UI with glider + tray + Swedish strings', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById('app');
    if (!app) throw new Error('no app');

    renderLesson(app);
    await new Promise(resolve => setTimeout(resolve, 10));

    const gate = app.querySelector('div[style*="position: fixed"]')!;
    const button = gate.querySelector('button')!;
    button.click();
    await new Promise(resolve => setTimeout(resolve, 10));

    // Gate overlay should be removed; only the chunk-tray (also position:fixed) remains.
    expect(app.querySelectorAll('div[style*="position: fixed"]').length).toBe(1);

    // Lesson UI should contain key classes and Swedish strings.
    expect(app.classList.contains('lesson-container')).toBe(true);
    expect(app.querySelector('.sound-glider')).not.toBeNull();
    expect(app.querySelector('.chunk-tray')).not.toBeNull();
    expect(app.querySelector('.word-display')?.textContent).toBe('bil');
    expect(app.querySelector('.pass-indicator')?.textContent).toContain('Omgång 1 av 2');
    expect(app.querySelector('.step-counter')?.textContent).toContain('Steg 1 av 16');
    expect(app.querySelector('.btn-step')?.textContent).toContain('Nästa ord');
    expect(app.querySelector('.lesson-header')?.textContent).toBe('Läsläs: CVC');
    expect(app.querySelector('.chunk-tray')?.getAttribute('aria-label')).toBe('Ljud att dra med');
  });

  it('cleanupLesson is idempotent', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById('app');
    if (!app) throw new Error('no app');

    renderLesson(app);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(() => cleanupLesson()).not.toThrow();
    expect(() => cleanupLesson()).not.toThrow();
  });
});