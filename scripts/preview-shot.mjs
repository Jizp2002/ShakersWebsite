import { chromium } from '@playwright/test';

const targetUrl = process.argv[2] || 'http://localhost:5174/';
const outputPath = process.argv[3] || 'scratch_preview.png';
const width = Number(process.argv[4]) || 1280;
const height = Number(process.argv[5]) || 900;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(targetUrl);
  await page.waitForSelector('.public-header', { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.header-artwork img').evaluate(async (img) => {
    await img.decode();
  });
  await page.screenshot({ path: outputPath });
  await browser.close();
  console.log(`Saved screenshot to ${outputPath}`);
})();
