// Typography / spacing audit. Reports, per route and viewport:
//  - words broken across lines (mid-word wrap)
//  - clipped text (overflow hidden/clip with content larger than the box)
//  - text smaller than 14px
//  - text blocks hugging the viewport edge (< 12px gutter)
//  - text that overflows its own container horizontally
//  - horizontal page overflow
// Usage: node e2e/audit.mjs <baseUrl> [outJson]
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5207/'
const outFile = process.argv[3]
const ROUTES = [
  '/', '/talk', '/talk?mode=keyboard', '/talk?mode=phrases', '/talk?mode=pain', '/day', '/timer', '/tokens', '/calm',
  '/feelings', '/feelings/hug', '/stories', '/stories/doctor', '/games', '/games/animals', '/games/find', '/games/memory',
  '/games/syllables', '/games/stickers', '/exercises', '/exercises/blow', '/exercises/voice', '/exercises/mirror',
  '/exercises/mirror/smile', '/board-setup', '/parent?qa', '/parent/progress?qa', '/parent/tips?qa', '/parent/cards?qa',
  '/parent/profiles?qa', '/parent/settings?qa', '/parent/data?qa', '/parent/print?qa', '/parent/about?qa',
]
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)
const ROUTES_TO_RUN = ONLY.length ? ROUTES.filter((r) => ONLY.some((o) => r === o || r.startsWith(o + '/') || r.startsWith(o + '?'))) : ROUTES
const VIEWPORTS = [
  { name: 'phone-360', width: 360, height: 740, touch: true },
  { name: 'phone-390', width: 390, height: 844, touch: true },
  { name: 'phone-land', width: 844, height: 390, touch: true },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
  { name: 'board', width: 1920, height: 1080, touch: true, board: true },
]
const LANGS = (process.env.LANGS ?? 'uz,ru,uzc').split(',')

const probe = () => {
  const out = []
  const vw = window.innerWidth
  const short = (el) => {
    const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : ''
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`
  }
  const seen = new Set()
  const add = (kind, el, extra) => {
    const key = kind + short(el) + (extra ?? '')
    if (seen.has(key)) return
    seen.add(key)
    out.push({ kind, el: short(el), text: (el.textContent ?? '').trim().slice(0, 40), extra })
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? ''
    if (!text.trim()) continue
    const el = node.parentElement
    if (!el || el.closest('[aria-hidden="true"], script, style, .visually-hidden, [hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const box = el.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    // word broken across lines
    const re = /[^\s\-‐-―­]+/g
    let m
    let broken = false
    while ((m = re.exec(text)) && !broken) {
      if (m[0].length < 4) continue
      // words that carry soft hyphens break at syllables on purpose
      if (text.slice(Math.max(0, m.index - 1), m.index + m[0].length + 1).includes('­')) continue
      const r = document.createRange()
      r.setStart(node, m.index)
      r.setEnd(node, m.index + m[0].length)
      const rects = Array.from(r.getClientRects()).filter((x) => x.width > 0)
      if (rects.length > 1 && Math.abs(rects[0].top - rects[rects.length - 1].top) > rects[0].height * 0.6) {
        add('word-broken', el, m[0])
        broken = true
      }
    }
    const fs = parseFloat(cs.fontSize)
    if (fs < 12.9) add('small-text', el, `${fs}px`)
    const inScroller = (() => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 2) return true
      }
      return false
    })()
    if (!inScroller && (box.left < 10 || box.right > vw - 10)) {
      if (box.right > vw + 1 || box.left < -1) add('outside-viewport', el, `${Math.round(box.left)}..${Math.round(box.right)}`)
      else if (box.width > 40) add('edge-hug', el, `${Math.round(box.left)}..${Math.round(box.right)}`)
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[aria-hidden="true"], .visually-hidden') || el.tagName === 'LEGEND') continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && (el.textContent ?? '').trim()) add('clipped-x', el, `${el.scrollWidth}>${el.clientWidth}`)
    if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && (el.textContent ?? '').trim()) add('clipped-y', el, `${el.scrollHeight}>${el.clientHeight}`)
  }
  const over = document.documentElement.scrollWidth - vw
  if (over > 1) out.push({ kind: 'page-overflow-x', el: 'html', text: '', extra: `${over}px` })
  return out
}

const browser = await chromium.launch()
const report = []
for (const lang of LANGS) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch })
    await ctx.addInitScript(
      ([board, lang]) => {
        localStorage.setItem(
          'gapimiz.device',
          JSON.stringify({ state: { uiLang: lang, uzScript: lang === 'uzc' ? 'cyrl' : 'latn', onboarded: true, activeProfileId: null, boardMode: board, boardHintDismissed: true, boardCalibration: board ? { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 } : null, parentPinHash: null }, version: 1 }),
        )
      },
      [!!vp.board, lang],
    )
    const page = await ctx.newPage()
    for (const r of ROUTES_TO_RUN) {
      await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(450)
      const issues = await page.evaluate(probe)
      for (const i of issues) report.push({ lang, vp: vp.name, route: r, ...i })
    }
    await ctx.close()
  }
}
await browser.close()

const grouped = new Map()
for (const r of report) {
  const k = `${r.kind} | ${r.route} | ${r.el} | ${r.extra ?? ''}`
  const g = grouped.get(k) ?? { ...r, where: new Set() }
  g.where.add(`${r.lang}/${r.vp}`)
  grouped.set(k, g)
}
const lines = [...grouped.values()].map((g) => `${g.kind.padEnd(16)} ${g.route.padEnd(26)} ${g.el.padEnd(28)} ${String(g.extra ?? '').padEnd(14)} "${g.text}"  [${[...g.where].slice(0, 6).join(', ')}${g.where.size > 6 ? ` +${g.where.size - 6}` : ''}]`)
console.log(lines.length ? lines.join('\n') : 'no issues')
console.log(`\n${lines.length} distinct issues, ${report.length} raw`)
if (outFile) writeFileSync(outFile, JSON.stringify(report, null, 1))
