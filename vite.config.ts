import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
});
