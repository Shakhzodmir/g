// Puts the child and the adult screenshot of the same screen side by side (labels: Child | Adult).
// Usage: node e2e/modes-compose.mjs <childDir> <adultDir> <outDir>
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const [childDir, adultDir, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const SCREENS = ['_', '_talk', '_games']
const VPS = ['phone', 'tablet', 'laptop', 'board']
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1800, height: 1000 } })
const uri = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`
for (const vp of VPS) {
  for (const s of SCREENS) {
    const c = join(childDir, `child-${vp}${s}.png`)
    const a = join(adultDir, `adult-${vp}${s}.png`)
    await page.setContent(`<body style="margin:0;background:#222;display:flex;gap:16px;padding:16px;align-items:flex-start;font:16px sans-serif;color:#fff">
      <figure style="margin:0"><figcaption>Child</figcaption><img src="${uri(c)}" style="max-height:940px;max-width:880px"></figure>
      <figure style="margin:0"><figcaption>Adult</figcaption><img src="${uri(a)}" style="max-height:940px;max-width:880px"></figure></body>`)
    await page.screenshot({ path: join(out, `side-${vp}${s === '_' ? '_home' : s}.png`), fullPage: true })
  }
}
await b.close()
