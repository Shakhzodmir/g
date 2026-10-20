// Visual QA for "Nutq tekshiruvi": screenshots of every screen at phone and laptop size, in the chosen language.
// Usage: node e2e/check-shots.mjs <baseUrl> <outDir>      (dev server: ?qa unlocks the adult area)
//   LANGS=uz,ru,uzc  THEME=bolajon|tun|kattalar|hc-light   (optional)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { demoCheckRows } from './lib/checkRows.mjs'
import { seedApp } from './lib/seed.mjs'

const [base = 'http://localhost:5271/', out = 'shots-check'] = process.argv.slice(2)
const LANGS = (process.env.LANGS ?? 'uz').split(',')
const THEME = process.env.THEME
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
]
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const lang of LANGS) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`${lang}/${vp.name} pageerror: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && problems.push(`${lang}/${vp.name} console: ${m.text()}`))
    await seedApp(page, base, { lang, kind: 'child', profile: THEME ? { theme: THEME } : {}, rows: demoCheckRows('p-test') })
    const shot = async (name) => {
      await page.waitForTimeout(350)
      await page.screenshot({ path: join(out, `${lang}-${vp.name}-${name}.png`), fullPage: true })
    }
    const go = async (route) => {
      await page.goto(`${base}#${route}`, { waitUntil: 'networkidle' })
    }
    await go('/parent?qa')
    await shot('01-parent-home')
    await go('/parent/check?qa')
    await shot('02-hub')
    await go('/parent/check/child?qa')
    await shot('03-child-overview')
    await go('/parent/check/asd?qa')
    await shot('04-asd-overview-due')
    await go('/parent/check/adult?qa')
    await shot('05-adult-overview')
    await go('/parent/check/child/report?qa')
    await shot('06-report')
    // a fresh run through the real UI
    await go('/parent/check/child/run?qa')
    await shot('07-age')
    await page.locator('[data-age="3-4"]').click()
    await shot('08-concerns')
    await page.locator('[data-concern="fluency"]').click()
    await page.getByRole('button', { name: /^(Keyingi|Дальше|Кейинги)$/ }).click()
    await shot('09-question')
    for (let i = 0; i < 5; i++) await page.locator(`[data-answer="${i === 3 ? 0 : 2}"]`).click()
    await shot('10-quick-result')
    await ctx.close()
  }
}
await browser.close()
console.log(problems.length ? problems.join('\n') : 'no console errors')
