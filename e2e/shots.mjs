// Visual QA helper: screenshots routes at several viewports.
// Usage: node e2e/shots.mjs <baseUrl> <outDir> [route1 route2 ...]
// Seeds an onboarded child profile so screens past onboarding render.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [base = 'http://localhost:5190/', out = 'shots', ...routes] = process.argv.slice(2)
const ROUTES = routes.length ? routes : ['/', '/talk', '/day']
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'phone-land', width: 844, height: 390, touch: true },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
  { name: 'board', width: 1920, height: 1080, touch: true, board: true },
]
const kind = process.env.KIND ?? 'child'
const uiLang = process.env.UILANG ?? 'uz'

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, deviceScaleFactor: 1 })
  await ctx.addInitScript(
    ([board, uiLang]) => {
      if (location.hash.startsWith('#/onboarding')) return
      localStorage.setItem(
        'gapimiz.device',
        JSON.stringify({ state: { uiLang, uzScript: uiLang === 'uzc' ? 'cyrl' : 'latn', onboarded: true, activeProfileId: null, boardMode: board, boardHintDismissed: true, boardCalibration: board ? { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 } : null, parentPinHash: null }, version: 1 }),
      )
    },
    [!!vp.board, uiLang],
  )
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`${vp.name} pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && problems.push(`${vp.name} console: ${m.text()}`))
  for (const r of ROUTES) {
    await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
    if (kind === 'adult') {
      await page.evaluate(() => undefined)
    }
    await page.waitForTimeout(700)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 1) problems.push(`${vp.name} ${r}: horizontal overflow ${overflow}px`)
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, [role=button], a, input[type=range]'))
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width > 0 && (b.width < 44 || b.height < 44)).length,
    )
    if (small) problems.push(`${vp.name} ${r}: ${small} targets < 44px`)
    const file = join(out, `${vp.name}${r.replace(/[^a-z0-9]+/gi, '_')}.png`)
    await page.screenshot({ path: file, fullPage: false })
  }
  await ctx.close()
}
await browser.close()
console.log(problems.length ? problems.join('\n') : 'no problems')
