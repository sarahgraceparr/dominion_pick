import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Makes the web app installable on Android (and desktop) and usable offline.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'robots.txt'],
      manifest: {
        name: 'Dominion Pick',
        short_name: 'Dominion Pick',
        description: 'Picks fun, synergistic Dominion kingdoms from the sets you own.',
        theme_color: '#7a4a1e',
        background_color: '#f7f2e8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  build: {
    outDir: 'dist/web',
    sourcemap: true,
  },
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
});
