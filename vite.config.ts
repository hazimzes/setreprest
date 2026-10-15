import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /setreprest/. Override with VITE_BASE_PATH
// (e.g. set to '/' for a user site). Dev server always runs at root.
const base = process.env.VITE_BASE_PATH ?? '/setreprest/';

import type { ManifestOptions } from 'vite-plugin-pwa';

const manifest: Partial<ManifestOptions> = {
  name: 'SetRepRest',
  short_name: 'SetRepRest',
  description: 'Local-first workout tracker — log sets, track PRs, train offline.',
  theme_color: '#0d0f12',
  background_color: '#0d0f12',
  display: 'standalone',
  start_url: '.',
  scope: '.',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest,
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    sourcemap: false,
    target: 'es2022',
  },
});
