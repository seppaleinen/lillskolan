// Integration test: Hub opens, shows lesson grid, launches phonics-cvc in iframe,
// simulates LESSON_PROGRESS and LESSON_COMPLETE, verifies progress persistence.
import { test, expect, chromium, Browser } from '@playwright/test';

const HUB_URL = 'http://localhost:5173';
const LESSON_URL = 'http://localhost:5174';
const STORAGE_KEY = 'lillskolan.progress.v1';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('Hub integration flow', () => {
  test('shows lesson grid with phonics-cvc card', async () => {
    const page = await browser.newPage();
    await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Should have header
    const header = page.locator('h1');
    await expect(header).toHaveText('Lillskolan');

    // Should show lesson card for phonics-cvc
    const card = page.locator('.lesson-card');
    await expect(card).toBeVisible();
    await expect(page.locator('.lesson-card').first()).toContainText('Fonetik CVC');
  });

  test('tapping lesson opens full-screen iframe', async () => {
    const page = await browser.newPage();
    await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click the lesson card
    await page.locator('.lesson-card').first().click();
    await page.waitForTimeout(500);

    // Should have lesson view with iframe
    const iframe = page.locator('iframe');
    await expect(iframe).toBeVisible();

    // Iframe should have sandbox attributes
    const sandbox = await iframe.getAttribute('sandbox');
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).toContain('allow-same-origin');

    // Should show return button
    const returnBtn = page.locator('.return-button');
    await expect(returnBtn).toBeVisible();
  });

  test('lesson sends progress events that update UI', async () => {
    const page = await browser.newPage();
    await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click lesson
    await page.locator('.lesson-card').first().click();
    await page.waitForTimeout(500);

    // Wait for iframe to load lesson content
    const iframe = page.locator('iframe');
    await iframe.waitFor({ state: 'visible' });
    
    // Wait for demo lesson to send some progress events (it sends every 2 seconds)
    await page.waitForTimeout(8000);

    // Progress bar should be visible and have updated text
    const progressBar = page.locator('.progress-bar__label');
    await expect(progressBar).toBeVisible();
    
    // Should show "Steg X av Y" - check within timeout loop
    let progressText = '';
    for (let i = 0; i < 10; i++) {
      progressText = await progressBar.textContent() || '';
      if (/Steg \d+ av \d+/.test(progressText)) break;
      await page.waitForTimeout(1000);
    }
    expect(progressText).toMatch(/Steg \d+ av \d+/);
  });

  test('lesson completion persists stars', async () => {
    const page = await browser.newPage();
    await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click lesson
    await page.locator('.lesson-card').first().click();
    await page.waitForTimeout(500);

    // Wait for demo lesson to complete (sends complete after 3 steps = 6 seconds)
    await page.waitForTimeout(12000);

    // Stars display should show 3 stars
    const starsDisplay = page.locator('.stars-display');
    await expect(starsDisplay).toBeVisible();

    // Now go back to grid
    await page.locator('.return-button').click();
    await page.waitForTimeout(500);

    // Grid should be visible again
    await expect(page.locator('.lesson-grid')).toBeVisible();

    // Card should show stars (need to check localStorage)
    const storedProgress = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);

    expect(storedProgress).not.toBeNull();
    expect(storedProgress.progress['phonics-cvc']).toBeDefined();
    expect(storedProgress.progress['phonics-cvc'].stars).toBe(3);
  });

  test('clean unmount blanks iframe', async () => {
    const page = await browser.newPage();
    await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click lesson
    await page.locator('.lesson-card').first().click();
    await page.waitForTimeout(500);

    // Verify iframe has lesson content
    const iframe = page.locator('iframe');
    const srcBefore = await iframe.getAttribute('src');
    expect(srcBefore).toContain(LESSON_URL);

    // Click return button
    await page.locator('.return-button').click();
    await page.waitForTimeout(500);

    // Iframe should be gone or blank
    const remainingIframe = page.locator('iframe');
    // After return, the lesson view is removed, so no iframe should remain
    const count = await remainingIframe.count();
    expect(count).toBe(0);
  });
});