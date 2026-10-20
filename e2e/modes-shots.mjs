// Proof screenshots: child vs adult, same routes, side by side.
// Usage: node e2e/modes-shots.mjs <baseUrl> <outDir> [uz|uzc|ru]
// Creates a real profile per kind through the onboarding wizard, then walks Home, Talk, Games hub and a few more.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [base = 'http://localhost:5261/', out = 'shots-modes', lang = 'uz'] = process.argv.slice(2)
const ROUTES = ['/', '/talk', '/games', '/day', '/exercises']
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 820, height: 1180, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
  { name: 'board', width: 1920, height: 1080, touch: true, board: true },
]
const LANG_BTN = { uz: /Oʻzbekcha|O‘zbekcha|lotin/i, uzc: /Ўзбекча/, ru: /Русский/ }
const KIND_BTN = { child: { uz: /Bola/, uzc: /Бола/, ru: /Ребёнок/ }, adult: { uz: /Katta/, uzc: /Катта/, ru: /Взрослый/ } }

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const kind of (process.env.KINDS ?? 'child,adult').split(',')) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`${kind} ${vp.name} pageerror: ${e.message}`))
    await page.goto(`${base}#/`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: LANG_BTN[lang] }).first().click()
    await page.getByRole('button', { name: KIND_BTN[kind][lang] }).first().click()
    await page.locator('input').first().fill(lang === 'ru' ? 'Азиз' : 'Aziz')
    await page.locator('form button').last().click()
    await page.waitForTimeout(300)
    await page.getByRole('button').filter({ hasText: /tkazib|Пропустить|тказиб/ }).first().click().catch(() => undefined)
    await page.waitForTimeout(600)
    if (vp.board) {
      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('gapimiz.device'))
        raw.state.boardMode = true
        raw.state.boardHintDismissed = true
        raw.state.boardCalibration = { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 }
        localStorage.setItem('gapimiz.device', JSON.stringify(raw))
      })
      await page.reload({ waitUntil: 'networkidle' })
    }
    for (const r of ROUTES) {
      await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 1) problems.push(`${kind} ${vp.name} ${r}: horizontal overflow ${overflow}px`)
      await page.screenshot({ path: join(out, `${kind}-${vp.name}${r.replace(/[^a-z0-9]+/gi, '_')}.png`) })
    }
    await ctx.close()
  }
}
await browser.close()
console.log(problems.length ? problems.join('\n') : 'no problems')
