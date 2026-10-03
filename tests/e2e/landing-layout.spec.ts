import { test, expect } from '@playwright/test';

test('landing keeps its frame, navigation and content readable across screen sizes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.editorial-landing')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [767, 1000],
    [768, 1024],
    [820, 1180],
    [1023, 768],
    [1024, 768],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const frame = rect('.header-artwork');
      const copy = rect('.hero-content');
      const media = rect('.hero-media');
      const nav = rect(innerWidth >= 1024 ? '.public-nav' : '.menu-toggle');
      const strip = rect('.values-strip');
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        frameMargin: frame.left,
        frameCenter: (frame.left + frame.right) / 2 - innerWidth / 2,
        navCenter: (nav.left + nav.right) / 2 - innerWidth / 2,
        aligned: [
          '.editorial-hero',
          '.values-strip',
          '.belong-section',
          '.editorial-landing > .public-container',
          '.public-footer',
        ].every((selector) => {
          const r = rect(selector);
          return Math.abs(r.left - frame.left) < 1 && Math.abs(r.right - frame.right) < 1;
        }),
        overlap:
          Math.max(0, Math.min(copy.right, media.right) - Math.max(copy.left, media.left)) *
          Math.max(0, Math.min(copy.bottom, media.bottom) - Math.max(copy.top, media.top)),
        messagesFit: [...document.querySelectorAll('.values-strip > span:not(.strip-star)')].every(
          (el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left >= strip.left &&
              r.right <= strip.right &&
              r.top >= strip.top &&
              r.bottom <= strip.bottom &&
              el.scrollWidth <= el.clientWidth + 1
            );
          },
        ),
      };
    });
    expect(geometry.overflow, `overflow at ${width}`).toBeLessThanOrEqual(1);
    expect(geometry.frameMargin).toBeGreaterThanOrEqual(16);
    expect(Math.abs(geometry.frameCenter)).toBeLessThan(1);
    expect(Math.abs(geometry.navCenter), `menu center at ${width}`).toBeLessThan(1);
    expect(geometry.aligned, `section edges at ${width}`).toBe(true);
    expect(geometry.overlap, `copy/image overlap at ${width}`).toBe(0);
    expect(geometry.messagesFit, `clipped messages at ${width}`).toBe(true);
    if (height === 390) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Somos Shakers' })
        .click();
      await expect(page).toHaveURL(/#nosotros$/);
      await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
    }
  }
});
