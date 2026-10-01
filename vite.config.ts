import { defineConfig, loadEnv } from 'vite';
import { connectionSettings } from './src/lib/connection';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const { configError, isDemo } = connectionSettings(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_ENABLE_DEMO,
  );
  if (command === 'build') {
    if (configError)
      throw new Error('Falta la conexión de Supabase. No se publicará una demo como sustituto.');
    if (env.NETLIFY === 'true' && isDemo)
      throw new Error('Netlify no permite publicar la demo de pruebas.');
    const key = env.VITE_SUPABASE_ANON_KEY || '';
    let role = '';
    try {
      role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;
    } catch {
      /* Publishable keys are not JWTs. */
    }
    if (key.startsWith('sb_secret_') || role === 'service_role')
      throw new Error('Usa una clave pública de Supabase, nunca una credencial de servidor.');
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Shakers · Mi comunidad',
          short_name: 'Shakers',
          lang: 'es',
          description: 'Conecta, crece y participa en tu comunidad.',
          theme_color: '#12111b',
          background_color: '#12111b',
          display: 'standalone',
          start_url: '/app',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
          globIgnores: ['branding/**'],
          navigateFallback: '/index.html',
          // Cache application assets only. Never cache API responses, member data, or uploads.
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
