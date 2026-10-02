/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Registration is handled by the useRegisterSW() hook in
      // UpdatePrompt.tsx instead, so the prompt UI has state to work with.
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Forest Spelling Adventure',
        short_name: 'Spelling Adventure',
        description: 'A playful spelling and phonics game for early learners.',
        theme_color: '#4f9d4a',
        background_color: '#bfe8ff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache every built asset so the whole game (all levels/puzzles,
        // since content.generated.json is bundled into the JS) works offline
        // after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: '/index.html',
        // Without this, a newly-activated worker (after the learner taps
        // "Update") never takes control of tabs that were already open — it
        // only controls future navigations, so the update prompt's reload
        // would silently do nothing on an existing tab.
        clientsClaim: true,
        runtimeCaching: [
          {
            // Google Fonts stylesheet: small and changes rarely, but check
            // the network first so a font update isn't stuck stale forever.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Actual font files: immutable content, safe to cache "forever".
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
