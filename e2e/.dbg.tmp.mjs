import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
await ctx.addInitScript(() => localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: true, boardHintDismissed: true, boardCalibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.1, reach: 0.15 }, parentPinHash: null }, version: 1 })))
const page = await ctx.newPage()
await page.goto('http://localhost:5246/#/timer', { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
console.log(await page.evaluate(() => { const out=[]; for (const e of document.querySelectorAll('body *')) { const b=e.getBoundingClientRect(); if (b.bottom>innerHeight+1 && b.height>0) out.push(e.tagName+'.'+String(e.className).slice(0,30)+' '+Math.round(b.top)+'-'+Math.round(b.bottom)) } return JSON.stringify({sh:document.documentElement.scrollHeight, ih:innerHeight, out:out.slice(0,10), shell: document.querySelector('[data-board]').getBoundingClientRect().height}) }))
await browser.close()
