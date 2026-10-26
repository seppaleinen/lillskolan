import { readFileSync } from 'node:fs';
import { beforeEach } from 'vitest';

/**
 * Shared test setup for hub tests.
 * Injects styles.css into JSDOM so getComputedStyle works.
 * Resets localStorage and body before each test.
 */
beforeEach(() => {
  // Inject CSS (only once per session — subsequent calls are no-op)
  if (!document.head.querySelector('style[data-test-setup]')) {
    const css = readFileSync('src/styles.css', 'utf-8');
    const style = document.createElement('style');
    style.setAttribute('data-test-setup', 'true');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Reset localStorage
  window.localStorage.clear();

  // Clear body children (but keep the injected style)
  const bodyChildren = Array.from(document.body.children);
  bodyChildren.forEach((child) => {
    if (!child.hasAttribute('data-test-setup')) {
      document.body.removeChild(child);
    }
  });
});