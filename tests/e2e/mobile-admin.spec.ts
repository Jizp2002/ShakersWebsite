import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]) {
  test(`administration remains usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const fits = async () =>
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    await fits();
    await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
    await page.getByRole('button', { name: /Entrar como coordinador/ }).click();
    await page.getByRole('link', { name: 'Administración', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Todo en su lugar.' })).toBeVisible();
    for (const tab of [
      'Encuentros',
      'Asistencia',
      'Equipos',
      'Miembros',
      'Contenido',
      'Galería',
      'Moderación',
      'Resumen',
    ]) {
      await page
        .getByRole('navigation', { name: 'Secciones de administración' })
        .getByRole('button', { name: new RegExp('^' + tab) })
        .click();
      await fits();
    }
    await page.screenshot({ path: `test-results/admin-${viewport.width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Crear encuentro', exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Título', { exact: true }).fill('Evento móvil ' + viewport.width);
    await modal
      .getByLabel('Descripción', { exact: true })
      .fill('Encuentro creado desde teléfono o iPad con todas sus funciones.');
    await modal.getByLabel('Ubicación', { exact: true }).fill('Auditorio principal');
    await modal.getByLabel('Estado', { exact: true }).selectOption('published');
    expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({
      path: `test-results/event-form-${viewport.width}.png`,
      fullPage: true,
    });
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await page.getByRole('button', { name: 'Encuentros', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Evento móvil ' + viewport.width }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Encuentros', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Evento móvil ' + viewport.width }),
    ).toBeVisible();
    await fits();
    await page.getByRole('link', { name: 'Volver a mi comunidad' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto('/app/agenda');
    await expect(page.getByRole('link', { name: 'Crear encuentro' })).toBeVisible();
    await page.getByRole('link', { name: 'Crear encuentro' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByLabel('Cerrar ventana').click();
    await page.goto('/app/mi-espacio');
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver administración' })).toBeVisible();
    await fits();
  });
}
