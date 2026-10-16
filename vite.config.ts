import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const YEAR = 60 * 60 * 24 * 365

export default defineConfig({
  // Relative base: the site keeps working if the repository (and Pages path) is renamed.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: './',
        name: 'Gapimiz',
        short_name: 'Gapimiz',
        description:
          'Gapimiz — nutqida qiyinchiligi bor bolalar va kattalar uchun muloqot va oʻyinlar. Общение и развитие речи для детей и взрослых.',
        lang: 'uz',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FBF7F0',
        theme_color: '#0A7584',
        categories: ['education', 'kids', 'health'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,png,woff2,mp3,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: { maxEntries: 16, maxAgeSeconds: YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-models',
              expiration: { maxEntries: 4, maxAgeSeconds: YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
