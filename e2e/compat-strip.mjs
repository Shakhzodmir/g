// Old-engine emulation for classroom whiteboards / panels (Android WebView & Chrome 90-110, iOS 15-16).
//
// We cannot install old browsers here, so we load the BUILT app in current Chromium and rewrite every built
// stylesheet on the fly, removing/neutralising each CSS feature the target engine does not know - exactly what an
// old engine does with them: an unknown declaration is dropped (so a hand-written fallback declared before it wins),
// an unknown @-rule or selector drops its whole rule, and an unknown token inside a custom property is kept but
// makes every `var()` that uses it "invalid at computed-value time" (the black calm-flower bug).
//
// Feature table (first Chrome version that has it):
//   translate/scale/rotate props 104 · :has() 105 · container queries (container-type, @container, cq units) 105
//   dvh/svh/lvh 108 · color-mix() 111 · text-wrap 114
// Profiles:  c90 (all features missing) · c104 · c107 (only dvh+color-mix) · c110 (only color-mix) · modern (control, untouched)
//
// Usage:
//   npx vite build                                  # first: the script reads dist/
//   node e2e/compat-strip.mjs                       # all profiles, default routes, phone + board
//   node e2e/compat-strip.mjs --profiles c90,c107 --routes /,/talk --out C:/tmp/compat
//   COMPAT_URL=http://localhost:5252/ node e2e/compat-strip.mjs   # use an already running server (vite preview)
// Output: <out>/<profile>/<viewport>-<route>.png, <out>/sheets/<viewport>-<route>.png (all profiles side by side,
// labelled) and a metrics table on stdout (document height vs viewport, horizontal overflow, console errors).
// Exit code 1 when a screen is taller than 1.25x the viewport in board mode or overflows horizontally.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const OUT = opt('out', 'C:/Users/aigpa/AppData/Local/Temp/claude/compat')
const PROFILE_NAMES = opt('profiles', 'modern,c110,c107,c104,c90').split(',')
// (Git Bash rewrites a lone "/" argument into "C:/Program Files/Git/": undo that, or run with MSYS_NO_PATHCONV=1.)
const ROUTES = opt('routes', '/,/talk,/timer,/calm,/games,/exercises,/day')
  .split(',')
  .map((r) => r.replace(/^[A-Za-z]:\/.*?\/Git\/?/, '/'))
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'board', width: 1920, height: 1080, touch: true, board: true },
]

// ---------------------------------------------------------------- profiles
const PROFILES = {
  modern: {},
  c110: { colorMix: true },
  c107: { colorMix: true, dvh: true },
  c104: { colorMix: true, dvh: true, container: true, has: true, textWrap: true },
  c90: { colorMix: true, dvh: true, container: true, has: true, individualTransforms: true, textWrap: true },
}

// ---------------------------------------------------------------- tiny CSS tree (works on minified output)
function parse(text) {
  let i = 0
  const n = text.length
  const skipWs = () => {
    for (;;) {
      while (i < n && /\s/.test(text[i])) i++
      if (text.startsWith('/*', i)) {
        const e = text.indexOf('*/', i + 2)
        i = e < 0 ? n : e + 2
      } else break
    }
  }
  function block() {
    const nodes = []
    for (;;) {
      skipWs()
      if (i >= n) return nodes
      if (text[i] === '}') {
        i++
        return nodes
      }
      let start = i
      let depth = 0
      let q = null
      while (i < n) {
        const c = text[i]
        if (q) {
          if (c === '\\') i++
          else if (c === q) q = null
        } else if (c === '"' || c === "'") q = c
        else if (c === '(' || c === '[') depth++
        else if (c === ')' || c === ']') depth--
        else if (depth === 0 && (c === '{' || c === ';' || c === '}')) break
        i++
      }
      const prelude = text.slice(start, i).trim()
      if (text[i] === '{') {
        i++
        nodes.push({ prelude, children: block() })
      } else {
        if (text[i] === ';') i++
        if (prelude) nodes.push({ prelude, children: null })
      }
    }
  }
  return block()
}
function serialize(nodes) {
  return nodes
    .map((nd) => (nd.children ? `${nd.prelude}{${serialize(nd.children)}}` : `${nd.prelude};`))
    .join('')
}

const RE_VIEWPORT_UNIT = /\d(dv|sv|lv)(h|w|i|b|min|max)(?![a-z])/
const RE_CQ = /\d(cqi|cqb|cqw|cqh|cqmin|cqmax)(?![a-z])/

function transform(nodes, p) {
  const out = []
  for (const nd of nodes) {
    if (nd.children === null) {
      const d = declaration(nd, p)
      if (d) out.push(d)
      continue
    }
    const pre = nd.prelude
    if (pre.startsWith('@')) {
      if (/^@container\b/.test(pre) && p.container) continue // unknown at-rule: dropped with its body
      let prelude = pre
      if (/^@supports\b/.test(pre)) prelude = supportsPrelude(pre, p)
      out.push({ prelude, children: transform(nd.children, p) })
      continue
    }
    if (p.has && /:has\(/.test(pre)) continue // one unknown selector invalidates the whole rule
    out.push({ prelude: pre, children: transform(nd.children, p) })
  }
  return out
}
function supportsPrelude(pre, p) {
  let s = pre
  if (p.colorMix) s = s.replace(/color-mix\(/g, 'color-mixx(')
  if (p.dvh) s = s.replace(/(\d)(dv|sv|lv)(h|w|i|b|min|max)/g, '$1$2$3x')
  if (p.container) s = s.replace(/\(\s*(container-type|container-name|container)\s*:/g, '($1x:').replace(/(\d)(cq[a-z]+)/g, '$1$2x')
  if (p.has) s = s.replace(/:has\(/g, ':hasx(')
  if (p.individualTransforms) s = s.replace(/\(\s*(translate|scale|rotate)\s*:/g, '($1x:')
  if (p.textWrap) s = s.replace(/\(\s*text-wrap\s*:/g, '(text-wrapx:')
  return s
}
function declaration(nd, p) {
  const colon = nd.prelude.indexOf(':')
  if (colon < 0) return nd
  const prop = nd.prelude.slice(0, colon).trim()
  const value = nd.prelude.slice(colon + 1)
  const custom = prop.startsWith('--')
  const lacks =
    (p.container && (/^container(-type|-name)?$/.test(prop) || RE_CQ.test(value))) ||
    (p.dvh && RE_VIEWPORT_UNIT.test(value)) ||
    (p.colorMix && /color-mix\(/.test(value)) ||
    (p.individualTransforms && /^(translate|scale|rotate)$/.test(prop)) ||
    (p.textWrap && /^text-wrap/.test(prop))
  if (!lacks) return nd
  if (!custom) return null // unknown declaration: dropped, an earlier fallback declaration survives
  // custom properties accept any tokens; the damage appears when a var() consumer is computed: poison the tokens.
  let v = value
  if (p.colorMix) v = v.replace(/color-mix\(/g, 'color-mixx(')
  if (p.dvh) v = v.replace(/(\d)(dv|sv|lv)(h|w|i|b|min|max)(?![a-z])/g, '$1$2$3x')
  if (p.container) v = v.replace(/(\d)(cq[a-z]+)(?![a-z])/g, '$1$2x')
  return { prelude: `${prop}:${v}`, children: null }
}
export function stripCss(css, profile) {
  const p = PROFILES[profile]
  if (!p || !Object.keys(p).length) return css
  return serialize(transform(parse(css), p))
}

// ---------------------------------------------------------------- static server for dist/ (only when COMPAT_URL is unset)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' }
async function startServer() {
  if (process.env.COMPAT_URL) return { url: process.env.COMPAT_URL, close: () => {} }
  const dist = join(root, 'dist')
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/ missing: run `npx vite build` first')
  const srv = createServer((req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '')
    let file = join(dist, path)
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html')
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  await new Promise((r) => srv.listen(Number(process.env.COMPAT_PORT ?? 5253), r))
  return { url: `http://localhost:${srv.address().port}/`, close: () => srv.close() }
}

// ---------------------------------------------------------------- run
const server = await startServer()
const browser = await chromium.launch()
const rows = []
const layouts = new Map() // profile|viewport|route -> [[name, left, top, width, height], ...] (layout boxes, transforms ignored)
let failed = false
for (const profile of PROFILE_NAMES) {
  mkdirSync(join(OUT, profile), { recursive: true })
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, serviceWorkers: 'block' })
    await ctx.addInitScript(
      ([board]) => {
        localStorage.setItem(
          'gapimiz.device',
          JSON.stringify({ state: { uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: board, boardHintDismissed: true, boardCalibration: board ? { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 } : null, parentPinHash: null }, version: 1 }),
        )
      },
      [!!vp.board],
    )
    // JS feature checks (CSS.supports) must agree with the stripped stylesheet, so src/lib/viewportUnit.ts takes its old-engine path.
    await ctx.addInitScript((p) => {
      const orig = CSS.supports.bind(CSS)
      CSS.supports = (...a) => {
        const q = a.join(' ')
        if (p.dvh && /[sdl]v[hw]/.test(q)) return false
        if (p.colorMix && /color-mix/.test(q)) return false
        if (p.container && /container/.test(q)) return false
        if (p.has && /:has/.test(q)) return false
        return orig(...a)
      }
    }, PROFILES[profile])
    await ctx.route(/\.css(\?.*)?$/, async (route) => {
      const resp = await route.fetch()
      await route.fulfill({ response: resp, body: stripCss(await resp.text(), profile), headers: { ...resp.headers(), 'content-type': 'text/css' } })
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const r of ROUTES) {
      await page.goto(`${server.url}#${r}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      const m = await page.evaluate(() => ({
        h: document.documentElement.scrollHeight,
        w: document.documentElement.scrollWidth,
        iw: innerWidth,
        ih: innerHeight,
      }))
      layouts.set(`${profile}|${vp.name}|${r}`, await page.evaluate(() =>
        Array.from(document.querySelectorAll('body *'))
          .filter((e) => e instanceof HTMLElement)
          .map((e) => [(e.tagName + '.' + String(e.className).split(' ')[0]).slice(0, 40), e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight]),
      ))
      const file = join(OUT, profile, `${vp.name}${r.replace(/[^a-z0-9]+/gi, '_')}.png`)
      await page.screenshot({ path: file })
      const tall = m.h / m.ih
      const bad = (vp.board && tall > 1.25) || m.w - m.iw > 1
      if (bad) failed = true
      rows.push(`${profile.padEnd(7)} ${vp.name.padEnd(6)} ${r.padEnd(11)} doc ${m.w}x${m.h} (${tall.toFixed(2)}x tall)${m.w - m.iw > 1 ? '  H-OVERFLOW ' + (m.w - m.iw) : ''}${bad ? '  <-- BAD' : ''}${errors.length ? '  errors: ' + errors.join('|') : ''}`)
      errors.length = 0
    }
    await ctx.close()
  }
}
await browser.close()
server.close()

// Layout equality against the unmodified build: every element should sit where it sits on a modern engine.
// (Colours may differ - that is what the fallbacks are for - positions and sizes must not.)
if (PROFILE_NAMES.includes('modern')) {
  let same = 0
  for (const [key, boxes] of layouts) {
    const [profile, vpName, route] = key.split('|')
    if (profile === 'modern') continue
    const ref = layouts.get(`modern|${vpName}|${route}`)
    if (!ref) continue
    const diffs = []
    if (ref.length !== boxes.length) diffs.push(`element count ${ref.length} vs ${boxes.length}`)
    else
      boxes.forEach((b, i) => {
        const r = ref[i]
        if (b.slice(1).some((v, k) => Math.abs(v - r[k + 1]) > 3)) diffs.push(`${b[0]} [${r.slice(1)}] -> [${b.slice(1)}]`)
      })
    if (!diffs.length) same++
    if (diffs.length) failed = true
    if (diffs.length) rows.push(`LAYOUT ${profile.padEnd(7)} ${vpName.padEnd(6)} ${route.padEnd(11)} ${diffs.length} elements moved/resized, e.g. ${diffs.slice(0, 3).join(' | ')}`)
  }
  rows.push(`layout identical to modern on ${same} of ${layouts.size - layouts.size / PROFILE_NAMES.length} profile/screen combinations`)
}

// contact sheets: one per viewport+route, all profiles side by side
try {
  const sharp = (await import('sharp')).default
  mkdirSync(join(OUT, 'sheets'), { recursive: true })
  for (const vp of VIEWPORTS) {
    const cell = vp.board ? { w: 640, h: 360 } : { w: 300, h: 650 }
    for (const r of ROUTES) {
      const tag = `${vp.name}${r.replace(/[^a-z0-9]+/gi, '_')}`
      const parts = []
      for (let k = 0; k < PROFILE_NAMES.length; k++) {
        const buf = await sharp(join(OUT, PROFILE_NAMES[k], `${tag}.png`)).resize(cell.w, cell.h, { fit: 'contain', background: '#888' }).png().toBuffer()
        const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell.w}" height="22"><rect width="100%" height="100%" fill="#222"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#fff">${PROFILE_NAMES[k]}  ${vp.name} ${r}</text></svg>`)
        parts.push({ input: await sharp({ create: { width: cell.w, height: cell.h + 22, channels: 3, background: '#888' } }).composite([{ input: label, top: 0, left: 0 }, { input: buf, top: 22, left: 0 }]).png().toBuffer(), left: k * (cell.w + 4), top: 0 })
      }
      await sharp({ create: { width: PROFILE_NAMES.length * (cell.w + 4), height: cell.h + 22, channels: 3, background: '#fff' } }).composite(parts).png().toFile(join(OUT, 'sheets', `${tag}.png`))
    }
  }
} catch (e) {
  console.warn('contact sheets skipped:', e.message)
}
console.log(rows.join('\n'))
console.log(failed ? 'RESULT: problems found' : 'RESULT: ok')
process.exit(failed ? 1 : 0)
