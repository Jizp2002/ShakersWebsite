import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('vintage navigation preserves readable controls across phone, tablet and desktop', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  const header = page.locator('.vintage-header');
  for (const width of [320, 390, 720, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(header.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const artwork = header.getByRole('img', { name: 'Shakers · Una generación que agita' });
    await expect(artwork).toBeVisible();
    expect(
      await artwork.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    ).toBe(true);
    if (width < 1024) {
      await header.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(header.getByRole('link', { name: 'Somos Shakers' })).toBeVisible();
      await header.getByRole('link', { name: 'Inicio', exact: true }).focus();
      await page.keyboard.press('Escape');
      await expect(header.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
      await expect(header.getByRole('navigation')).toBeHidden();
    }
    await header.screenshot({ path: `test-results/vintage-header-${width}.png` });
  }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      if (width < 1024) await header.getByRole('button', { name: 'Abrir menú' }).click();
      const report = await new AxeBuilder({ page })
        .include('.vintage-header')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(report.violations).toEqual([]);
      await header.screenshot({ path: `test-results/vintage-header-${width}-${theme}.png` });
      if (width < 1024) await header.getByRole('button', { name: 'Cerrar menú' }).click();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await header.getByRole('button', { name: 'Abrir menú' }).click();
  await header.getByRole('link', { name: 'Encuentros', exact: true }).click();
  await expect(page).toHaveURL(/\/encuentros$/);
  await expect(header.getByRole('navigation')).toBeHidden();
  await header.getByRole('button', { name: 'Abrir menú' }).click();
  await header.getByRole('link', { name: 'Para crecer', exact: true }).click();
  await expect(page).toHaveURL(/\/recursos$/);
  await header.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});
