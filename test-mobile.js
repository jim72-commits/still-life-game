/**
 * Still Life - Mobile Device Simulation Test
 * Run: npx playwright test test-mobile.spec.js
 * Or: cd inference && npm install playwright && node test-mobile.js
 *
 * Tests: Menu → Chapter 1 → Prologue → Level 1 → Menu → [~] → alice → Level 30
 *        → Submit → Letter → Accomplishments → Summary → Share → Return → Reset → Prologue
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const INFERENCE_DIR = path.resolve(__dirname);
const GAME_URL = `file:///${INFERENCE_DIR.replace(/\\/g, '/')}/index.html`;
const SCREENSHOT_DIR = path.join(INFERENCE_DIR, 'test-screenshots');

// iPhone 12 Pro viewport (portrait)
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

// Phaser game canvas is 400x700
const CANVAS_W = 400;
const CANVAS_H = 700;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function takeScreenshot(page, name) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  Screenshot: ${file}`);
  return file;
}

function canvasToScreen(box, x, y) {
  return {
    x: box.x + (x / CANVAS_W) * box.width,
    y: box.y + (y / CANVAS_H) * box.height,
  };
}

async function tapCanvas(page, x, y) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) return false;
  const pt = canvasToScreen(box, x, y);
  await page.mouse.click(pt.x, pt.y);
  return true;
}

async function runTest() {
  const results = { passed: [], failed: [], screenshots: [] };
  let browser, page, context;

  console.log('Still Life - Mobile Test');
  console.log('URL:', GAME_URL);
  console.log('=======================\n');

  try {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      userAgent: USER_AGENT,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      ignoreHTTPSErrors: true,
    });

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Clear localStorage for fresh run
    await page.addInitScript(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('stilllife_'));
      keys.forEach(k => localStorage.removeItem(k));
    });

    // 1. Navigate
    console.log('1. Navigating to game...');
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3500); // Loading bar + fonts
    results.screenshots.push(await takeScreenshot(page, '01-loading'));

    await sleep(1500);
    const menuVisible = await page.locator('canvas').isVisible();
    if (!menuVisible) results.failed.push('Menu canvas not visible');
    else results.passed.push('Menu loaded');
    results.screenshots.push(await takeScreenshot(page, '02-menu'));

    // 2. Tap Chapter 1 card (center ~200, 255)
    console.log('2. Tapping Chapter 1...');
    await tapCanvas(page, 200, 255);
    await sleep(2500);
    results.screenshots.push(await takeScreenshot(page, '03-prologue-or-level'));

    // 3. Prologue: tap [ Skip ] at ~362, 672 or tap center to advance
    console.log('3. Skipping Prologue...');
    await tapCanvas(page, 362, 672);
    await sleep(2000);
    results.screenshots.push(await takeScreenshot(page, '04-level-1'));

    // 4. Tap Menu (≡) at ~14, 22 (hitArea extends to ~80x44)
    console.log('4. Tapping Menu button...');
    await tapCanvas(page, 50, 44);
    await sleep(800);
    results.screenshots.push(await takeScreenshot(page, '05-pause-panel'));

    // 5. Tap [~] at 348, 264
    console.log('5. Tapping [~] cheat...');
    await tapCanvas(page, 348, 264);
    await sleep(700);
    results.screenshots.push(await takeScreenshot(page, '06-dev-access'));

    // 6. Type alice
    console.log('6. Typing "alice"...');
    const input = page.locator('input[type="password"]');
    await input.waitFor({ state: 'visible', timeout: 3000 });
    await input.fill('alice');
    await sleep(1500);
    results.screenshots.push(await takeScreenshot(page, '07-level-30'));

    // 7. Submit (200, 560)
    console.log('7. Submitting level 30...');
    await tapCanvas(page, 200, 560);
    await sleep(3000);
    results.screenshots.push(await takeScreenshot(page, '08-letter-scene'));

    // 8. Letter: scroll paper, tap Accomplishments
    console.log('8. Letter scene - scroll & Accomplishments...');
    const paper = page.locator('#sl-paper');
    if (await paper.isVisible()) {
      await paper.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await sleep(400);
    }
    const accBtn = page.locator('#sl-close-btn');
    if (await accBtn.isVisible()) {
      await accBtn.click();
      await sleep(1500);
    }
    results.screenshots.push(await takeScreenshot(page, '09-summary'));

    // 9. Summary: Share (200, ~446) and Return to Menu (200, 545)
    console.log('9. Summary - Share & Return...');
    await tapCanvas(page, 200, 446);
    await sleep(500);
    await tapCanvas(page, 200, 545);
    await sleep(1500);
    results.screenshots.push(await takeScreenshot(page, '10-back-to-menu'));

    // 10. Reset Progress (200, 668)
    console.log('10. Reset Progress...');
    await tapCanvas(page, 200, 668);
    await sleep(700);
    await tapCanvas(page, 115, 398); // Yes, Reset
    await sleep(1500);
    results.screenshots.push(await takeScreenshot(page, '11-after-reset'));

    // 11. Tap Chapter 1 - expect Prologue
    console.log('11. Tapping Chapter 1 (expect Prologue)...');
    await tapCanvas(page, 200, 255);
    await sleep(2000);
    results.screenshots.push(await takeScreenshot(page, '12-prologue-after-reset'));

    console.log('\n--- Results ---');
    if (consoleErrors.length) {
      console.log('Console errors:', consoleErrors);
      results.failed.push(`Console errors: ${consoleErrors.length}`);
    }
    console.log('Passed:', results.passed);
    console.log('Failed:', results.failed);
    console.log('Screenshots:', SCREENSHOT_DIR);

  } catch (err) {
    console.error('Test error:', err);
    results.failed.push(err.message);
    if (page) await takeScreenshot(page, 'error').catch(() => {});
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

runTest().then(r => {
  process.exit(r.failed.length > 0 ? 1 : 0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
