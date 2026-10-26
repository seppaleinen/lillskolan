import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/hub/tests',
  testMatch: '**/integration.test.ts',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});