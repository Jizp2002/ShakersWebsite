import { spawn } from 'node:child_process';
const env = {
  ...process.env,
  VITE_ENABLE_DEMO: 'true',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_TURNSTILE_SITE_KEY: '',
};
function run(file, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [file, ...args], { env, stdio: 'inherit' });
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('Falló la prueba de interfaz.')),
    );
  });
}
try {
  await run('node_modules/vite/bin/vite.js', ['build', '--outDir', 'dist-demo']);
  await run('node_modules/@playwright/test/cli.js', ['test', ...process.argv.slice(2)]);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
