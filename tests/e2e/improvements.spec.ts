import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const photo = 'public/images/worship.jpg';
test('welcome, cropped profile photo, persistence and removal work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entrar');
  await page.getByRole('button', { name: /Entrar como joven/ }).click();
  await expect(page.getByRole('region', { name: 'Primeros pasos' })).toBeVisible();
  await page.screenshot({ path: 'test-results/welcome-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Ocultar bienvenida' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ver guía de bienvenida' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver guía de bienvenida' }).click();
  await page.getByRole('link', { name: /Hazlo tuyo/ }).click();
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByLabel('Elegir foto').setInputFiles(photo);
  await expect(page.getByLabel('Vista previa de tu foto')).toBeVisible();
  await page.getByLabel('Acercar').fill('1.5');
  await page.getByLabel('Posición horizontal').fill('0.3');
  await page.screenshot({ path: 'test-results/profile-crop-mobile.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.profile-card img')).toHaveAttribute('src', /^data:image\/webp/);
  await page.reload();
  await expect(page.locator('.profile-card img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByRole('button', { name: 'Quitar foto actual' }).click();
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.profile-card img')).toHaveCount(0);
});
test('event sharing and an authorized gallery photo can be published, viewed and removed', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar como coordinador' }).click();
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Galería', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir foto', exact: true }).click();
  await page.getByLabel('Fotografía', { exact: true }).setInputFiles(photo);
  await page.getByLabel('Descripción de la foto').fill('Compartiendo una noche en comunidad');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Publicar foto', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Compartiendo una noche en comunidad' }),
  ).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Ampliar: Compartiendo una noche en comunidad' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/eventos/00000000-0000-4000-8000-000000000011');
  await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute(
    'href',
    /^https:\/\/wa.me\//,
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Añadir a mi calendario' }).click();
  expect((await download).suggestedFilename()).toBe('encuentro-shakers.ics');
  await page.screenshot({ path: 'test-results/event-gallery-desktop.png', fullPage: true });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Galería', exact: true }).click();
  await page.getByRole('button', { name: /Eliminar foto: Compartiendo/ }).click();
  await page.getByRole('button', { name: 'Eliminar foto', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Aquí comienza el álbum de Shakers' }),
  ).toBeVisible();
});
