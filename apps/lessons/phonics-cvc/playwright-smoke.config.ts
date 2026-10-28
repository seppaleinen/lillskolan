import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for phonics-cvc mobile-emulation smoke tests.
 *
 * These tests verify tile count, layout, and structural properties on
 * emulated tablet viewports. They do NOT test drag interactions (which
 * require real pointer hardware) and do NOT fix pre-existing Hub E2E failures.
 *
 * Run with:
 *   cd apps/lessons/phonics-cvc
 *   npx playwright test --config=playwright-smoke.config.ts
 *
 * Requires dev server at http://localhost:5174.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'distractor-tiles-smoke.test.ts',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // serial to avoid port contention on dev server
  reporter: 'line',
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'iPad Air',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'iPad mini',
      use: { ...devices['iPad Mini 5'] },
    },
    {
      name: 'Android Tablet 10"',
      use: {
        viewport: { width: 800, height: 1280 },
        isMobile: true,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
  ],
});
