import { spawn } from 'node:child_process';
const env = {
  ...process.env,
  VITE_ENABLE_DEMO: 'false',
  VITE_SUPABASE_URL: 'https://shakers-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-test-key',
  VITE_TURNSTILE_SITE_KEY: '',
  VITE_AUTH_EMAIL_MODE: 'code',
  VITE_GOOGLE_AUTH_ENABLED: 'true',
};
function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('Falló la verificación de conexión.')),
    );
  });
}
try {
  await run('node_modules/vite/bin/vite.js', ['build', '--outDir', 'dist-connected']);
  await run('node_modules/@playwright/test/cli.js', [
    'test',
    '--config',
    'playwright.connected.config.ts',
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
