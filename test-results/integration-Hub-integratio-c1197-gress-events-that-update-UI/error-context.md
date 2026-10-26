# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration.test.ts >> Hub integration flow >> lesson sends progress events that update UI
- Location: apps/hub/tests/integration.test.ts:58:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /Steg \d+ av \d+/
Received string:  "Studerar..."
```

# Test source

```ts
  1   | // Integration test: Hub opens, shows lesson grid, launches phonics-cvc in iframe,
  2   | // simulates LESSON_PROGRESS and LESSON_COMPLETE, verifies progress persistence.
  3   | import { test, expect, chromium, Browser } from '@playwright/test';
  4   | 
  5   | const HUB_URL = 'http://localhost:5173';
  6   | const LESSON_URL = 'http://localhost:5174';
  7   | const STORAGE_KEY = 'lillskolan.progress.v1';
  8   | 
  9   | let browser: Browser;
  10  | 
  11  | test.beforeAll(async () => {
  12  |   browser = await chromium.launch();
  13  | });
  14  | 
  15  | test.afterAll(async () => {
  16  |   await browser.close();
  17  | });
  18  | 
  19  | test.describe('Hub integration flow', () => {
  20  |   test('shows lesson grid with phonics-cvc card', async () => {
  21  |     const page = await browser.newPage();
  22  |     await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
  23  |     await page.waitForTimeout(1000);
  24  | 
  25  |     // Should have header
  26  |     const header = page.locator('h1');
  27  |     await expect(header).toHaveText('Lillskolan');
  28  | 
  29  |     // Should show lesson card for phonics-cvc
  30  |     const card = page.locator('.lesson-card');
  31  |     await expect(card).toBeVisible();
  32  |     await expect(page.locator('.lesson-card').first()).toContainText('Fonetik CVC');
  33  |   });
  34  | 
  35  |   test('tapping lesson opens full-screen iframe', async () => {
  36  |     const page = await browser.newPage();
  37  |     await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
  38  |     await page.waitForTimeout(1000);
  39  | 
  40  |     // Click the lesson card
  41  |     await page.locator('.lesson-card').first().click();
  42  |     await page.waitForTimeout(500);
  43  | 
  44  |     // Should have lesson view with iframe
  45  |     const iframe = page.locator('iframe');
  46  |     await expect(iframe).toBeVisible();
  47  | 
  48  |     // Iframe should have sandbox attributes
  49  |     const sandbox = await iframe.getAttribute('sandbox');
  50  |     expect(sandbox).toContain('allow-scripts');
  51  |     expect(sandbox).toContain('allow-same-origin');
  52  | 
  53  |     // Should show return button
  54  |     const returnBtn = page.locator('.return-button');
  55  |     await expect(returnBtn).toBeVisible();
  56  |   });
  57  | 
  58  |   test('lesson sends progress events that update UI', async () => {
  59  |     const page = await browser.newPage();
  60  |     await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
  61  |     await page.waitForTimeout(1000);
  62  | 
  63  |     // Click lesson
  64  |     await page.locator('.lesson-card').first().click();
  65  |     await page.waitForTimeout(500);
  66  | 
  67  |     // Wait for iframe to load lesson content
  68  |     const iframe = page.locator('iframe');
  69  |     await iframe.waitFor({ state: 'visible' });
  70  |     
  71  |     // Wait for demo lesson to send some progress events (it sends every 2 seconds)
  72  |     await page.waitForTimeout(8000);
  73  | 
  74  |     // Progress bar should be visible and have updated text
  75  |     const progressBar = page.locator('.progress-bar__label');
  76  |     await expect(progressBar).toBeVisible();
  77  |     
  78  |     // Should show "Steg X av Y" - check within timeout loop
  79  |     let progressText = '';
  80  |     for (let i = 0; i < 10; i++) {
  81  |       progressText = await progressBar.textContent() || '';
  82  |       if (/Steg \d+ av \d+/.test(progressText)) break;
  83  |       await page.waitForTimeout(1000);
  84  |     }
> 85  |     expect(progressText).toMatch(/Steg \d+ av \d+/);
      |                          ^ Error: expect(received).toMatch(expected)
  86  |   });
  87  | 
  88  |   test('lesson completion persists stars', async () => {
  89  |     const page = await browser.newPage();
  90  |     await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
  91  |     await page.waitForTimeout(1000);
  92  | 
  93  |     // Click lesson
  94  |     await page.locator('.lesson-card').first().click();
  95  |     await page.waitForTimeout(500);
  96  | 
  97  |     // Wait for demo lesson to complete (sends complete after 3 steps = 6 seconds)
  98  |     await page.waitForTimeout(12000);
  99  | 
  100 |     // Stars display should show 3 stars
  101 |     const starsDisplay = page.locator('.stars-display');
  102 |     await expect(starsDisplay).toBeVisible();
  103 | 
  104 |     // Now go back to grid
  105 |     await page.locator('.return-button').click();
  106 |     await page.waitForTimeout(500);
  107 | 
  108 |     // Grid should be visible again
  109 |     await expect(page.locator('.lesson-grid')).toBeVisible();
  110 | 
  111 |     // Card should show stars (need to check localStorage)
  112 |     const storedProgress = await page.evaluate((key) => {
  113 |       const raw = localStorage.getItem(key);
  114 |       return raw ? JSON.parse(raw) : null;
  115 |     }, STORAGE_KEY);
  116 | 
  117 |     expect(storedProgress).not.toBeNull();
  118 |     expect(storedProgress.progress['phonics-cvc']).toBeDefined();
  119 |     expect(storedProgress.progress['phonics-cvc'].stars).toBe(3);
  120 |   });
  121 | 
  122 |   test('clean unmount blanks iframe', async () => {
  123 |     const page = await browser.newPage();
  124 |     await page.goto(HUB_URL, { waitUntil: 'domcontentloaded' });
  125 |     await page.waitForTimeout(1000);
  126 | 
  127 |     // Click lesson
  128 |     await page.locator('.lesson-card').first().click();
  129 |     await page.waitForTimeout(500);
  130 | 
  131 |     // Verify iframe has lesson content
  132 |     const iframe = page.locator('iframe');
  133 |     const srcBefore = await iframe.getAttribute('src');
  134 |     expect(srcBefore).toContain(LESSON_URL);
  135 | 
  136 |     // Click return button
  137 |     await page.locator('.return-button').click();
  138 |     await page.waitForTimeout(500);
  139 | 
  140 |     // Iframe should be gone or blank
  141 |     const remainingIframe = page.locator('iframe');
  142 |     // After return, the lesson view is removed, so no iframe should remain
  143 |     const count = await remainingIframe.count();
  144 |     expect(count).toBe(0);
  145 |   });
  146 | });
```