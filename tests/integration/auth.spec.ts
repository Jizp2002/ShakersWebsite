import { test, expect, type Page } from '@playwright/test';
const user = '22222222-2222-4222-8222-222222222222';
const jwt =
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') +
  '.' +
  Buffer.from(
    JSON.stringify({
      sub: user,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://shakers-test.supabase.co/auth/v1',
    }),
  ).toString('base64url') +
  '.testsignature';
async function mockBackend(page: Page, mode: 'new' | 'approved' | 'failure' | 'limited' = 'new') {
  let signedIn = false,
    requested = false;
  const account = {
    id: user,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'joven@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = () => ({
    access_token: jwt,
    refresh_token: 'synthetic-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    user: account,
  });
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  await page.route('https://shakers-test.supabase.co/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: Record<string, unknown> = {};
    try {
      body = request.postDataJSON() || {};
    } catch {}
    calls.push({ path, body });
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
        headers: { 'access-control-allow-origin': '*' },
      });
    if (path === '/auth/v1/token') {
      if (
        new URL(request.url()).searchParams.get('grant_type') === 'password' &&
        body.password !== 'Password-test-2026'
      )
        return reply({ msg: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400);
      signedIn = true;
      return reply(session());
    }
    if (path === '/auth/v1/user') return reply(account);
    if (path === '/auth/v1/signup') return reply({ user: account, session: null });
    if (path === '/auth/v1/recover') return reply({});
    if (path === '/auth/v1/otp')
      return reply(
        mode === 'limited'
          ? { msg: 'Email rate limit exceeded', error_code: 'over_email_send_rate_limit' }
          : {},
        mode === 'limited' ? 429 : 200,
      );
    if (path === '/auth/v1/verify') {
      if (body.token !== '123456')
        return reply({ msg: 'Token has expired or is invalid', error_code: 'otp_expired' }, 403);
      signedIn = true;
      return reply({
        access_token: jwt,
        refresh_token: 'synthetic-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: user,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'joven@example.test',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    }
    if (path === '/auth/v1/logout') {
      signedIn = false;
      return reply({});
    }
    if (path === '/rest/v1/rpc/submit_membership') {
      requested = true;
      return reply(null);
    }
    if (path.startsWith('/rest/v1/')) {
      if (mode === 'failure') return reply({ message: 'Synthetic database unavailable' }, 503);
      const table = path.slice('/rest/v1/'.length);
      if (signedIn && table === 'profiles')
        return reply([
          { id: user, name: 'Joven de prueba', age_group: '18+', interests: '', avatar_url: null },
        ]);
      if (signedIn && table === 'memberships' && (requested || mode === 'approved'))
        return reply([
          {
            id: user,
            role: 'member',
            status: mode === 'approved' ? 'approved' : 'pending',
            guardian_confirmed: false,
            created_at: new Date().toISOString(),
          },
        ]);
      return reply([]);
    }
    return reply({});
  });
  return calls;
}
test('real SDK email flow leads to onboarding and pending approval without demo data', async ({
  page,
}) => {
  const calls = await mockBackend(page);
  await page.goto('/entrar');
  await expect(page.getByRole('button', { name: /Entrar como joven/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Entrar con un enlace de correo' }).click();
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByRole('button', { name: 'Recibir código' }).click();
  await page.getByLabel('Código de acceso').fill('999999');
  await page.getByRole('button', { name: 'Verificar y entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('no es válido');
  await page.getByLabel('Código de acceso').fill('123456');
  await page.getByRole('button', { name: 'Verificar y entrar' }).click();
  await expect(page.getByRole('heading', { name: '¿Cómo te llamas?' })).toBeVisible();
  await page.getByLabel('Nombre', { exact: true }).fill('Joven de prueba');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solicitar ingreso' }).click();
  await expect(page.getByRole('heading', { name: 'Ya diste el primer paso.' })).toBeVisible();
  expect(
    calls.some((c) => c.path.endsWith('/otp') && c.body.email === 'joven@example.test'),
  ).toBeTruthy();
  expect(
    calls.some(
      (c) => c.path.endsWith('/rpc/submit_membership') && c.body.p_name === 'Joven de prueba',
    ),
  ).toBeTruthy();
});
test('approved member enters a genuinely empty connected community', async ({ page }) => {
  await mockBackend(page, 'approved');
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar con un enlace de correo' }).click();
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByRole('button', { name: 'Recibir código' }).click();
  await page.getByLabel('Código de acceso').fill('123456');
  await page.getByRole('button', { name: 'Verificar y entrar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Joven');
  await expect(page.getByRole('heading', { name: 'Algo bueno viene en camino' })).toBeVisible();
  await expect(page.getByText(/Modo demo/)).toHaveCount(0);
  await expect(page.getByText('Alex Rivera')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/app$/);
});
test('configured backend failure cannot fall back to a demo', async ({ page }) => {
  await mockBackend(page, 'failure');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No pudimos cargar este espacio.' })).toBeVisible({
    timeout: 15000,
  }); // SDK retries a 503 after 1, 2, and 4 seconds.
  await expect(page.getByText(/Modo demo/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});
test('email quota errors stay actionable', async ({ page }) => {
  await mockBackend(page, 'limited');
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar con un enlace de correo' }).click();
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByRole('button', { name: 'Recibir código' }).click();
  await expect(page.getByRole('alert')).toContainText('No pudimos enviar el código');
  await expect(page.getByRole('button', { name: 'Recibir código' })).toBeEnabled();
});

test('password login persists across reload, with no new email', async ({ page, context }) => {
  const calls = await mockBackend(page, 'approved');
  await page.goto('/entrar');
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('incorrectos');
  await page.getByLabel('Contraseña', { exact: true }).fill('Password-test-2026');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
  await expect(page).toHaveURL(/\/app$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Joven');
  expect(calls.filter((c) => c.path.endsWith('/otp') || c.path.endsWith('/recover'))).toHaveLength(
    0,
  );
  const saved = await context.storageState();
  expect(saved.origins.some((o) => o.localStorage.some((i) => i.name.includes('auth-token')))).toBe(
    true,
  );
});

test('signup requests leadership without assigning privileges, and validates matching passwords', async ({
  page,
}) => {
  const calls = await mockBackend(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByLabel('Nombre', { exact: true }).fill('Joven de prueba');
  await page.getByLabel('Quiero participar como').selectOption('leader');
  await page.getByLabel('Contraseña', { exact: true }).fill('Password-test-2026');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('No-coincide-2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  expect(calls.filter((c) => c.path.endsWith('/signup'))).toHaveLength(0);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Password-test-2026');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('status')).toContainText('Revisa tu correo');
  const signup = calls.find((c) => c.path.endsWith('/signup'))!;
  expect(signup.body.data).toEqual({ full_name: 'Joven de prueba', requested_role: 'leader' });
  expect(signup.body).not.toHaveProperty('role');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('existing link users can request a password and authenticated recovery can save it', async ({
  page,
}) => {
  const calls = await mockBackend(page, 'approved');
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Crear o recuperar contraseña', exact: true }).click();
  await page.getByLabel('Correo electrónico').fill('joven@example.test');
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
  await expect(page.getByRole('status')).toContainText('Si hay una cuenta');
  expect(calls.some((c) => c.path.endsWith('/recover'))).toBe(true);
  // The recovery request stores a PKCE verifier; exchange it through the real SDK callback.
  await page.goto('/entrar?recovery=1&code=synthetic-recovery-code');
  await expect(page.getByRole('heading', { name: 'Elige tu nueva contraseña' })).toBeVisible();
  await page.getByLabel('Contraseña', { exact: true }).fill('Password-test-2027');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Password-test-2027');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(
    calls.some((c) => c.path.endsWith('/user') && c.body.password === 'Password-test-2027'),
  ).toBe(true);
});
