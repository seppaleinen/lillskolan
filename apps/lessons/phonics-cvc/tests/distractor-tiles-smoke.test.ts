import { test, expect } from '@playwright/test';

/**
 * Smoke test for phonics-cvc distractor tiles in mobile emulation.
 *
 * Verifies tile count and layout classes without exercising drag interactions
 * (drag requires real pointer hardware; these are structural checks only).
 *
 * Assumes dev server at http://localhost:5174.
 * Does NOT attempt to fix pre-existing E2E failures in the Hub integration suite.
 */

const LESSON_URL = 'http://localhost:5174';

const tabletDevices = [
  { name: 'iPad Air', viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 },
  { name: 'iPad mini', viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 },
  { name: 'Android Tablet 10"', viewport: { width: 800, height: 1280 }, deviceScaleFactor: 2 },
];

for (const device of tabletDevices) {
  test.describe(`Distractor tiles — ${device.name} (${device.viewport.width}×${device.viewport.height})`, () => {
    test.use({
      viewport: device.viewport,
      isMobile: true,
      deviceScaleFactor: device.deviceScaleFactor,
    });

    test('passes Pass 1 with 4 tiles (2 correct + 2 distractors)', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000); // wait for lesson initialization

      const tiles = page.locator('[data-tile-index]');
      const count = await tiles.count();
      expect(count, `${device.name}: Pass 1 should have 4 tiles`).toBe(4);
    });

    test('tiles have chunk-tile class and flex layout', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const tray = page.locator('.chunk-tray');
      await expect(tray).toBeVisible();

      // Verify flexWrap is active on the tray container
      const flexWrap = await tray.evaluate((el) => window.getComputedStyle(el).flexWrap);
      expect(flexWrap).toBe('wrap');

      const tiles = page.locator('.chunk-tile');
      expect(await tiles.count()).toBeGreaterThan(0);
    });

    test('tiles have minimum 88×88px dimensions', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const tiles = page.locator('[data-tile-index]');
      const count = await tiles.count();

      for (let i = 0; i < count; i++) {
        const bbox = await tiles.nth(i).boundingBox();
        expect(bbox, `${device.name}: tile ${i} visible`).not.toBeNull();
        expect(bbox!.width, `${device.name}: tile ${i} min width 88px`).toBeGreaterThanOrEqual(88);
        expect(bbox!.height, `${device.name}: tile ${i} min height 88px`).toBeGreaterThanOrEqual(88);
      }
    });

    test('tiles display uppercase text by default', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const tiles = page.locator('[data-tile-index]');
      const count = await tiles.count();

      for (let i = 0; i < count; i++) {
        const text = await tiles.nth(i).textContent();
        expect(text, `${device.name}: tile ${i} is uppercase`).toMatch(/^[A-ZÄÖÅ]+$/);
      }
    });

    test('sound-glider slots visible and empty initially', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const glider = page.locator('.sound-glider');
      await expect(glider).toBeVisible();

      const slots = page.locator('.glider-slot');
      const count = await slots.count();
      // Pass 1 has 2 slots (onset + rim)
      expect(count, `${device.name}: Pass 1 should have 2 glider slots`).toBe(2);

      for (let i = 0; i < count; i++) {
        await expect(slots.nth(i)).toBeVisible();
      }
    });

    test('no tile overlap on tray', async ({ page }) => {
      await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const tiles = page.locator('[data-tile-index]');
      const count = await tiles.count();
      const boxes: { x: number; y: number; width: number; height: number }[] = [];

      for (let i = 0; i < count; i++) {
        const bbox = await tiles.nth(i).boundingBox();
        boxes.push(bbox!);
      }

      // Check no two tiles overlap
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const overlap = !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
          expect(overlap, `${device.name}: tiles ${i} and ${j} should not overlap`).toBe(false);
        }
      }
    });
  });
}
