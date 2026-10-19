import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE ?? 'http://localhost:5246/'
const W = +(process.env.W ?? 1920), H = +(process.env.H ?? 1080)
const reachList = (process.env.REACH ?? '0.45').split(',').map(Number)
const scale = +(process.env.SCALE ?? 1.5)
const out = process.env.OUT ?? 'e2e/.shots'
const shots = process.env.SHOTS === '1'
const routes = (process.env.ROUTES ?? '/,/talk,/day,/timer,/tokens,/calm,/feelings,/stories,/games,/exercises,/exercises/blow,/exercises/voice,/exercises/mirror,/exercises/mirror/smile').split(',')
const kind = process.env.KIND ?? 'child'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
let bad = 0
for (const reach of reachList) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true })
  await ctx.addInitScript(([reach, scale]) => {
    localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: true, boardHintDismissed: true, boardCalibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale, reach }, parentPinHash: null }, version: 1 }))
  }, [reach, scale])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERR', e.message))
  for (const r of routes) {
    await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const res = await page.evaluate(() => {
      const nav = document.querySelector('nav')?.getBoundingClientRect()
      const navTop = nav ? nav.top : innerHeight
      const rs = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const reachH = getComputedStyle(document.querySelector('[data-board]') ).getPropertyValue('--reach-h')
      const zones = [...document.querySelectorAll('[data-reach]')].map((z) => { const b = z.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), scroll: z.scrollHeight - z.clientHeight } })
      const els = [...document.querySelectorAll('main button, main [role=button], main input, main a')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden=true]') })
      const behind = els.filter((e) => e.getBoundingClientRect().bottom > navTop + 1 && !e.closest('[data-reach]')).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 16))
      const rail = document.querySelector('aside')?.getBoundingClientRect()
      const overRail = rail ? els.filter((e) => { const b = e.getBoundingClientRect(); return b.right > rail.left + 1 && b.left < rail.right && b.bottom > rail.top && b.top < rail.bottom }).length : 0
      const hasH1 = !!document.querySelector('h1')
      return { navTop: Math.round(navTop), rs, docScroll: document.documentElement.scrollHeight - innerHeight, mainScroll: (() => { const m = document.querySelector('main'); return m.scrollHeight - m.clientHeight })(), mainScroll: (() => { const m = document.querySelector('main'); return m.scrollHeight - m.clientHeight })(), zones, behind, overRail }
    })
    const reachPx = Math.max(res.rs * 10, (res.navTop) * reach)  // approx: --reach-h = max(10rem, (100dvh-navH)*reach)
    const zoneTop = res.navTop - reachPx
    const zbad = res.zones.filter((z) => z.top < zoneTop - 2 || z.bottom > res.navTop + 2)
    const flag = [res.zones.length === 0 ? 'NO_ZONE' : '', zbad.length ? 'ZONE_OUT' : '', res.behind.length ? 'BEHIND_NAV:' + res.behind.join('|') : '', res.overRail ? 'RAIL_OVERLAP' : '', res.docScroll > 1 ? 'DOC_SCROLL+' + res.docScroll : '', res.mainScroll > 1 ? 'MAIN_SCROLL+' + res.mainScroll : ''].filter(Boolean).join(' ')
    if (flag) bad++
    console.log(`r${reach} ${r.padEnd(24)} zoneTop~${Math.round(zoneTop)} nav${res.navTop} zones=${JSON.stringify(res.zones)} ${flag || 'ok'}`)
    if (shots) await page.screenshot({ path: `${out}/${W}x${H}_r${reach}_s${scale}${r.replace(/[^a-z0-9]+/gi, '_')}.png` })
  }
  await ctx.close()
}
await browser.close()
console.log('flagged:', bad)
