// Horizontal-overflow probe for tiny screens and big text: every route at 320x568 and 360x740, at the normal root font size
// and at 200% (root font-size 32px, what "browser text zoom 200%" does). Reports page-level horizontal scroll and visible
// elements that stick out of the viewport (outside a horizontal scroller). Exit code 1 when anything is found.
//   node e2e/overflow.mjs http://localhost:5251/        (dev server: ?qa unlocks the adult area)
//   ONLY=/talk,/timer node e2e/overflow.mjs http://localhost:5251/
import { chromium } from '@playwright/test'
import { demoCheckRows } from './lib/checkRows.mjs'
import { seedApp } from './lib/seed.mjs'

const base = process.argv[2] ?? 'http://localhost:5251/'
const ROUTES = [
  '/', '/talk', '/talk?mode=keyboard', '/talk?mode=phrases', '/talk?mode=pain', '/day', '/timer', '/tokens', '/calm',
  '/feelings', '/feelings/hug', '/stories', '/stories/doctor', '/games', '/games/animals', '/games/find', '/games/memory',
  '/games/syllables', '/games/stickers', '/exercises', '/exercises/blow', '/exercises/voice', '/exercises/mirror',
  '/exercises/mirror/smile', '/board-setup', '/parent?qa', '/parent/progress?qa', '/parent/tips?qa', '/parent/cards?qa',
  '/parent/profiles?qa', '/parent/settings?qa', '/parent/data?qa', '/parent/print?qa', '/parent/about?qa',
  '/parent/print?sheet=diary&qa', '/parent/print?sheet=routine&qa', '/parent/print?sheet=artic&qa', '/parent/print?sheet=contacts&qa', '/parent/help?qa',
  '/parent/check?qa', '/parent/check/child?qa', '/parent/check/asd?qa', '/parent/check/adult?qa', '/parent/check/child/run?qa', '/parent/check/child/run?retest=1&qa',
  '/parent/check/asd/run?qa', '/parent/check/adult/run?qa', '/parent/check/child/report?qa', '/parent/check/asd/report?qa',
]
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)
const routes = ONLY.length ? ROUTES.filter((r) => ONLY.some((o) => r === o || r.startsWith(o + '/') || r.startsWith(o + '?'))) : ROUTES
const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
]
const LANGS = (process.env.LANGS ?? 'uz,ru').split(',')
const VP_FILTER = (process.env.VPS ?? '').split(',').filter(Boolean)

const probe = () => {
  const vw = window.innerWidth
  const out = []
  const over = document.documentElement.scrollWidth - vw
  if (over > 1) out.push(`page scrolls sideways by ${over}px`)
  const seen = new Set()
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.visually-hidden, [hidden]')) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || (r.right <= vw + 1 && r.left >= -1)) continue
    let scroller = false
    let clipped = false
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p)
      if (o.position === 'fixed') break
      if (o.overflowX === 'auto' || o.overflowX === 'scroll') scroller = true
      if (o.overflowX === 'hidden' || o.overflowX === 'clip') clipped = true
    }
    if (scroller) continue
    if (clipped && !(el.textContent ?? '').trim()) continue
    const key = el.tagName + '.' + String(el.className).split(' ')[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(`${key} ${Math.round(r.left)}..${Math.round(r.right)} "${(el.textContent ?? '').trim().slice(0, 28)}"${clipped ? ' (clipped by an ancestor)' : ''}`)
  }
  return out
}

const browser = await chromium.launch()
let bad = 0
for (const lang of LANGS) {
  for (const vp of VIEWPORTS.filter((v) => !VP_FILTER.length || VP_FILTER.includes(v.name))) {
    for (const big of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true })
      await ctx.addInitScript((l) => {
        localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang: l, uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: false, boardHintDismissed: true, boardCalibration: null, parentPinHash: null }, version: 1 }))
      }, lang)
      const page = await ctx.newPage()
      if (routes.some((r) => r.startsWith('/parent/check'))) await seedApp(page, base, { lang, kind: 'child', rows: demoCheckRows('p-test') })
      for (const r of routes) {
        await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
        if (big) {
          await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
          await page.evaluate(() => window.dispatchEvent(new Event('resize'))) // what the browser does when the text size changes
        }
        await page.waitForTimeout(350)
        const found = await page.evaluate(probe)
        if (found.length) {
          bad++
          console.log(`${lang} ${vp.name}${big ? ' 200%' : ''} ${r}\n    ${found.slice(0, 5).join('\n    ')}`)
        }
      }
      await ctx.close()
    }
  }
}
await browser.close()
console.log(bad ? `\n${bad} route/viewport combinations overflow` : 'no horizontal overflow')
process.exit(bad ? 1 : 0)
