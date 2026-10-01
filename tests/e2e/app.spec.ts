import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const login = async (page: Page, role = 'joven') => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: new RegExp('Entrar como ' + role) }).click();
  await expect(page).toHaveURL(/\/app$/);
};
test('public site is navigable, responsive, and accessible in both themes', async ({ page }) => {
  // Keep relative demo events inside the displayed month, even when run on its last day.
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00-04:00'));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hechos para');
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: 'Usar tema claro' }).click();
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Encuentros', exact: true })
    .click();
  await expect(page).toHaveURL(/\/encuentros$/);
  await page.getByRole('button', { name: 'Vista de calendario' }).click();
  await expect(page.locator('.calendar-grid a')).toHaveCount(2);
  expect(errors).toEqual([]);
});
test('member can register, cancel, vote, and confirm responsibility', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alex');
  await page.screenshot({ path: 'test-results/community-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Quiero participar', exact: true }).click();
  await page.getByRole('button', { name: 'Quiero participar', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Nos vemos ahí!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cancelar mi inscripción' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar mi inscripción' }).click();
  await expect(page.getByRole('button', { name: 'Quiero participar', exact: true })).toBeVisible();
  await page.goto('/app');
  await page.getByRole('button', { name: /Una salida para servir/ }).click();
  await expect(page.getByRole('button', { name: /Una salida para servir/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/app/mi-espacio');
  await page.getByRole('button', { name: 'Cuenten conmigo' }).click();
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByRole('dialog').getByLabel('Nombre', { exact: true }).fill('Alex de prueba');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alex de prueba' })).toBeVisible();
});
test('private prayer remains in personal requests and community prayer awaits moderation', async ({
  page,
}) => {
  await login(page);
  await page.goto('/app/comunidad');
  await page.getByRole('button', { name: 'Pedir oración' }).click();
  await page
    .getByLabel('Tu petición', { exact: true })
    .fill('Petición privada creada en prueba de navegador.');
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Petición privada creada en prueba de navegador.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mis peticiones', exact: true }).click();
  await expect(page.getByText('Petición privada creada en prueba de navegador.')).toBeVisible();
  await page.getByRole('button', { name: 'Pedir oración' }).click();
  await page
    .getByLabel('Tu petición', { exact: true })
    .fill('Petición comunitaria pendiente de revisión.');
  await page.getByLabel('¿Quién puede leerla?').selectOption('community');
  await page.getByLabel('Ocultar mi nombre a otros miembros').check();
  await page.getByRole('button', { name: 'Enviar petición' }).click();
  await page.getByRole('button', { name: 'Muro de oración' }).click();
  await expect(page.getByText('Petición comunitaria pendiente de revisión.')).toHaveCount(0);
});
test('admin creates an event, approves a minor, and moderates community content', async ({
  page,
}) => {
  await login(page, 'coordinador');
  await page.goto('/admin');
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Crear encuentro', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Encuentro creado desde el panel');
  await dialog
    .getByLabel('Descripción', { exact: true })
    .fill('Un encuentro para probar el recorrido completo.');
  await dialog.getByLabel('Ubicación', { exact: true }).fill('Sala principal');
  await dialog.getByLabel('Estado', { exact: true }).selectOption('published');
  await dialog.getByRole('button', { name: 'Vista previa' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Encuentro creado desde el panel' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Volver a editar' }).click();
  await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Encuentros', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Encuentro creado desde el panel' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Miembros/ }).click();
  await expect(page.getByRole('button', { name: 'Aprobar ingreso' })).toBeDisabled();
  await page.getByLabel('He confirmado la autorización de su responsable.').check();
  await page.getByRole('button', { name: 'Aprobar ingreso' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitudes al día' })).toBeVisible();
  await page.getByRole('button', { name: 'Moderación', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar revisada', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Todas las peticiones están revisadas' }),
  ).toBeVisible();
});
test('pending access is gated and mobile navigation stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entrar');
  await page.getByRole('button', { name: /Ver solicitud pendiente/ }).click();
  await expect(page.getByRole('heading', { name: 'Ya diste el primer paso.' })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Ya diste el primer paso.' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await login(page);
  await page
    .getByRole('navigation', { name: 'Navegación móvil' })
    .getByRole('link', { name: 'Comunidad', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Aquí nadie camina solo.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/community-mobile.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
});
test('offline mode exposes no private data and offers reconnection', async ({ page, context }) => {
  await login(page);
  await context.setOffline(true);
  await expect(
    page.getByRole('heading', { name: 'Volvemos a conectar en un momento.' }),
  ).toBeVisible();
  await expect(page.getByText('Alex')).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alex');
});
