import { chromium } from '@playwright/test'
const routes = (process.env.ROUTES ?? '/').split(',')
const W = +(process.env.W ?? 1920), H = +(process.env.H ?? 1080), reach=+(process.env.REACH ?? 0.45), scale=+(process.env.SCALE ?? 1.5)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true })
await ctx.addInitScript(([reach, scale]) => localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: true, boardHintDismissed: true, boardCalibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale, reach }, parentPinHash: null }, version: 1 })), [reach, scale])
const page = await ctx.newPage()
for (const r of routes) {
  await page.goto(`http://localhost:5246/#${r}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  const s = await page.evaluate(() => {
    const out = []
    const walk = (el, d) => { if (d > 3) return; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); out.push('  '.repeat(d) + el.tagName.toLowerCase() + '.' + String(el.className).split(' ').map(c=>c.replace(/_[a-zA-Z0-9]{5,}$/,'')).join('.') + ` [${Math.round(b.top)}-${Math.round(b.bottom)}, h${Math.round(b.height)}] ` + cs.display + ' pos:' + cs.position + (cs.flexGrow !== '0' ? ' grow' + cs.flexGrow : '') + (cs.alignContent !== 'normal' ? ' ac:' + cs.alignContent : '')); for (const c of el.children) walk(c, d + 1) }
    walk(document.querySelector('main'), 0); return out.join('\n')
  })
  console.log('=== ' + r + '\n' + s)
}
await browser.close()
