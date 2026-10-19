import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const base = process.env.BASE ?? 'http://localhost:5246/'
const W = +(process.env.W ?? 1920), H = +(process.env.H ?? 1080)
const reach = +(process.env.REACH ?? 0.45), scale = +(process.env.SCALE ?? 1.5)
const out = process.env.OUT ?? 'e2e/.shots'
const routes = (process.env.ROUTES ?? '/,/talk,/day,/timer,/tokens,/calm,/feelings,/stories,/games,/exercises,/exercises/blow,/exercises/voice,/exercises/mirror,/exercises/mirror/smile,/board-setup,/parent').split(',')
const KIND = process.env.KIND ?? 'child'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true })
await ctx.addInitScript(([reach, scale, kind]) => {
  localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: true, boardHintDismissed: true, boardCalibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale, reach }, parentPinHash: null }, version: 1 }))
}, [reach, scale, KIND])
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERR', e.message))
for (const r of routes) {
  await page.goto(`${base}#${r}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const res = await page.evaluate(() => {
    const vh = innerHeight, vw = innerWidth
    const nav = document.querySelector('nav')?.getBoundingClientRect()
    const teacher = document.querySelector('aside')?.getBoundingClientRect()
    const navTop = nav ? nav.top : vh
    const els = [...document.querySelectorAll('main button, main [role=button], main input, main a')].filter((e) => {
      const b = e.getBoundingClientRect(); const cs = getComputedStyle(e)
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !e.closest('[aria-hidden=true]')
    })
    const tops = els.map((e) => { const b = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 18), top: Math.round(b.top), bottom: Math.round(b.bottom) } })
    const overlapTeacher = teacher ? els.filter((e) => { const b = e.getBoundingClientRect(); return b.right > teacher.left && b.left < teacher.right && b.bottom > teacher.top && b.top < teacher.bottom }).map((e) => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 14)) : []
    const h1 = document.querySelector('h1')?.getBoundingClientRect()
    const h1ov = h1 && teacher && h1.right > teacher.left && h1.bottom > teacher.top && h1.top < teacher.bottom
    return { vh, navTop: Math.round(navTop), docH: document.documentElement.scrollHeight, scrollable: document.documentElement.scrollHeight - vh, n: els.length, minTop: tops.length ? Math.min(...tops.map((t) => t.top)) : null, maxBottom: tops.length ? Math.max(...tops.map((t) => t.bottom)) : null, behindNav: tops.filter((t) => t.bottom > navTop + 1).map((t) => t.n), overlapTeacher, h1ov: !!h1ov, teacher: teacher && [Math.round(teacher.left), Math.round(teacher.top), Math.round(teacher.right), Math.round(teacher.bottom)] }
  })
  const zoneTop = Math.round(res.navTop - (res.navTop) * reach)
  console.log(r.padEnd(24), `scroll+${res.scrollable}`, `ctrl y ${res.minTop}..${res.maxBottom}`, `zoneTop~${zoneTop}`, `n=${res.n}`, res.behindNav.length ? 'BEHIND_NAV:' + res.behindNav.join('|') : '', res.overlapTeacher.length ? 'TEACHER_OVERLAP:' + res.overlapTeacher.join('|') : '', res.h1ov ? 'H1_TEACHER' : '')
  await page.screenshot({ path: `${out}/${W}x${H}_r${reach}_s${scale}${r.replace(/[^a-z0-9]+/gi, '_')}.png` })
}
await browser.close()
