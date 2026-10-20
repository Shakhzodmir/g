import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vitest/config'

const YEAR = 60 * 60 * 24 * 365

// Chrome 90 / Safari 14 / iOS 14 (versions are encoded as major << 16): classroom boards and panels run old WebViews.
const LEGACY_TARGETS = { chrome: 90 << 16, safari: 14 << 16, ios_saf: 14 << 16 }

const publicDir = join(process.cwd(), 'public')
const symbolFiles = (): string[] => readdirSync(join(publicDir, 'symbols')).filter((f) => /\.(webp|svg)$/.test(f))
const customSymbolFiles = (): string[] => readdirSync(join(publicDir, 'symbols', 'custom')).filter((f) => f.endsWith('.svg'))

/**
 * Symbols the first screens need, precached with the app shell so the communicator works right after the first visit:
 * Home + navigation, the topic tabs and the fixed 6x6 core board, Yes/No. Every other symbol (about 300) is cached on first
 * use and by the low-priority background pack (src/lib/symbolsPack.ts), never by the service-worker install step.
 */
const SHELL_SYMBOLS = [
  'house', 'speaking_head', 'calendar', 'hourglass', 'star', 'calm', 'feelings', 'book', 'puzzle', 'lips', 'family',
  'keyboard', 'speech_balloon', 'face_with_head_bandage', 'glowing_star',
]
function precacheSymbolPatterns(): string[] {
  const ids = new Set<string>(SHELL_SYMBOLS)
  // read from the content sources (importing them would drag the whole content tree into the config loader)
  const contentDir = join(process.cwd(), 'src', 'content')
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(join(dir, e.name)) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [join(dir, e.name)] : []))
  const read = (f: string) => readFileSync(join(contentDir, f), 'utf8')
  const allContent = sources(contentDir)
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
  for (const m of read('topics.ts').matchAll(/symbol:\s*'([a-z0-9_]+)'/g)) ids.add(m[1])
  // core('id', uz, ru, ruTts, fitz, 'symbol', row, col, level): the fixed 6x6 board, which includes Yes and No
  for (const m of allContent.matchAll(/\bcore\([^\n]*'([a-z0-9_]+)',\s*\d+,\s*\d+,\s*\d+\)/g)) ids.add(m[1])
  const have = new Set(symbolFiles().map((f) => f.replace(/\.(webp|svg)$/, '')))
  const custom = new Set(customSymbolFiles().map((f) => f.replace(/\.svg$/, '')))
  const webp = [...ids].filter((id) => have.has(id) && !custom.has(id))
  const svg = [...ids].filter((id) => custom.has(id))
  const patterns: string[] = []
  if (webp.length) patterns.push(`symbols/{${webp.join(',')}}.webp`)
  if (svg.length) patterns.push(`symbols/custom/{${svg.join(',')}}.svg`)
  return patterns
}

/** `virtual:symbol-index`: every file in public/symbols, for the background symbols pack. */
function symbolIndex(): Plugin {
  const id = 'virtual:symbol-index'
  return {
    name: 'gapimiz-symbol-index',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(source) {
      if (source !== `\0${id}`) return undefined
      const list = [...symbolFiles().map((f) => `symbols/${f}`), ...customSymbolFiles().map((f) => `symbols/custom/${f}`)].sort()
      return `export default ${JSON.stringify(list)}`
    },
  }
}

/** Preloads the Latin Nunito subset (the UI font) so text does not swap after first paint. Hashed name comes from the bundle. */
function preloadUiFont(): Plugin {
  return {
    name: 'gapimiz-preload-font',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((f) => /nunito-latin-wght-normal.*\.woff2$/.test(f))
        if (!file) return html
        // relative href: the app lives under any sub-path (base './')
        return html.replace('</title>', `</title>\n    <link rel="preload" as="font" type="font/woff2" crossorigin href="./${file}" />`)
      },
    },
  }
}

export default defineConfig({
  // Relative base: the site keeps working if the repository (and Pages path) is renamed.
  base: './',
  plugins: [
    react(),
    symbolIndex(),
    preloadUiFont(),
    VitePWA({
      // 'prompt': a new version waits in the background; src/lib/swUpdate.ts applies it only when idle on Home or at next launch.
      registerType: 'prompt',
      injectRegister: null,
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
        // The default theme (Bolajon): the Android splash shows its calm background, not a bright cream.
        background_color: '#F4F8F7',
        theme_color: '#0A7584',
        categories: ['education', 'kids', 'health'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Gapirish / Говорить', short_name: 'Gapirish', url: './#/talk', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Kun tartibi / Мой день', short_name: 'Kun tartibi', url: './#/day', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // App shell only: html, js, css, fonts, icons, manifest and the symbols of the first screens. The rest of the symbols,
        // the audio and the MediaPipe files are runtime-cached (below) and prefetched in the background, so the service worker
        // installs in seconds even on a slow link instead of fetching ~450 files one after another.
        globPatterns: ['**/*.{js,css,html,woff2,json,png}', 'favicon.svg', ...precacheSymbolPatterns()],
        globIgnores: ['audio/**', 'mediapipe/**', 'sw-extra.js'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        // real files are never answered with the app; deeper "directory" paths are redirected to the scope root by sw-extra.js
        navigateFallbackDenylist: [/\.[a-z0-9]{2,5}$/i],
        importScripts: ['sw-extra.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Speech clips: cached on first play and by the background language pack (src/audio/offlinePack.ts).
            urlPattern: ({ url }) => url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-clips',
              expiration: { maxEntries: 4000, maxAgeSeconds: YEAR },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Picture symbols: cached on first use and by the background pack (src/lib/symbolsPack.ts).
            urlPattern: ({ url }) => url.pathname.includes('/symbols/') && /\.(webp|svg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'symbols',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Self-hosted MediaPipe wasm + face model (public/mediapipe), loaded by the mirror exercises.
            urlPattern: ({ url }) => url.pathname.includes('/mediapipe/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe',
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // CDN copies are only a fallback for a build without the local files.
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
  css: {
    // Down-levels modern CSS (static color-mix, nesting, logical props, range media queries...) for old classroom WebViews.
    // It does NOT rewrite dvh, container queries, :has(), individual translate/scale or color-mix() with var() arguments:
    // those carry hand-written fallbacks (see design/tokens.css, src/design/compat.test.ts, e2e/compat-strip.mjs).
    transformer: 'lightningcss',
    lightningcss: {
      targets: LEGACY_TARGETS,
      // Hash class names and @keyframes only, like the PostCSS modules this replaces. By default lightningcss also
      // hashes grid-area names per file, which breaks 'back title actions' areas shared by PageHeader and a screen's override.
      cssModules: { grid: false, customIdents: false, dashedIdents: false },
    },
  },
  build: {
    target: 'es2022',
    cssTarget: ['chrome90', 'safari14'],
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        // Stable chunks: a one-string change in the app must not rename (and so re-download) React, the router, motion,
        // Dexie or Zustand, nor ripple through every lazy chunk that imports shared code. One group with a name function
        // (the Rollup manualChunks shape); dependencies are NOT dragged into a group along with its modules, otherwise React
        // itself ends up inside the app's shared chunk and every shared edit renames it.
        codeSplitting: {
          groups: [
            {
              includeDependenciesRecursively: false,
              name(id: string) {
                // Vite's dynamic-import helper: otherwise it sits in the entry chunk and everything that lazy-loads imports `index`
                if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) return 'vite-helpers'
                if (id.includes('virtual:symbol-index') || id.includes('virtual:pwa-register')) return 'shared'
                if (id.includes('/node_modules/')) {
                  if (/\/node_modules\/lucide-react\//.test(id)) return 'vendor-icons'
                  if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
                  if (/\/node_modules\/(react-router|@remix-run)\//.test(id)) return 'vendor-router'
                  if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'vendor-motion'
                  if (/\/node_modules\/(dexie|dexie-react-hooks)\//.test(id)) return 'vendor-dexie'
                  if (/\/node_modules\/zustand\//.test(id)) return 'vendor-zustand'
                  return null
                }
                if (/\/src\/(i18n|store|ui|lib|audio|design)\//.test(id)) return 'shared'
                // data the audio code imports: a leaf chunk, so regenerating clips renames this file only
                if (/\/src\/content\/audio-(index|versions)\.json/.test(id)) return 'audio-data'
                // imported by shared code (speech, message bar); left outside they pull `shared` into a cycle with `index`
                if (/\/src\/features\/aac\/(entry|speak)\.ts/.test(id)) return 'shared'
                // vocabulary / phrase data the shared code and the entry both read; the lazy-only content files (stories, tips,
                // exercises, ...) stay out so they load with their screens
                if (/\/src\/content\/(more\/|(?!stories|tips|exercises|feelings|schedules|stickers|animals|voiceLines|gamedata|adultgamedata|audio-)[^/]+\.ts)/.test(id)) return 'content'
                // Small modules the entry chunk shares with lazy features (timer store, adult unlock, scheduled cards, shell strings):
                // left in `index` they made every shell edit rename every feature chunk that imports them.
                if (/\/src\/app\/(strings|cue)\.ts/.test(id)) return 'shell'
                if (/\/src\/features\/(timer\/(store|timerLogic|watcher)|parent\/unlock|schedule\/cards|board\/strings)\.ts/.test(id)) return 'feature-shared'
                return null
              },
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
