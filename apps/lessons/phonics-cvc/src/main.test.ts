import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderLesson } from './lesson';

// Mock fetch for manifest loading
const mockFetch = vi.fn();

function setupFetchMock() {
  // @ts-expect-error - mocking global fetch
  global.fetch = mockFetch;

  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      version: '1.0.0',
      words: [
        {
          id: 'bil',
          letters: ['b', 'i', 'l'],
          passes: [
            { chunks: [{ text: 'b', clip: 'b' }, { text: 'il', clip: 'il' }] },
            { chunks: [{ text: 'b', clip: 'b' }, { text: 'i', clip: 'i' }, { text: 'l', clip: 'l' }] }
          ]
        }
      ],
      clips: ['b', 'i', 'l', 'il']
    }),
  });
}

function teardownFetchMock() {
  // @ts-expect-error
  delete global.fetch;
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
});