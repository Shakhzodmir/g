import { expect, test } from '@playwright/test'

const SEED = {
  state: { uiLang: 'ru', uzScript: 'latn', onboarded: true, activeProfileId: null, boardMode: false, boardHintDismissed: true, boardCalibration: null, parentPinHash: null },
  version: 1,
}

test('index.html paints a splash and the PWA metadata without any JavaScript', async ({ request }) => {
  const html = await (await request.get('./')).text()
  expect(html).toContain('id="gz-splash"')
  expect(html).toContain('name="apple-mobile-web-app-capable"')
  expect(html).toContain('name="mobile-web-app-capable"')
  expect(html).toContain('apple-touch-icon-180.png')
  expect(html).toMatch(/<link rel="preload" as="font"[^>]*nunito-latin/)
  expect(html).toContain('Brauzerni yangilang')
  const manifest = await (await request.get('./manifest.webmanifest')).json()
  expect(manifest.background_color.toLowerCase()).toBe('#f4f8f7')
  expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual(['./#/talk', './#/day'])
})

test('the MediaPipe wasm and model are self-hosted', async ({ request }) => {
  for (const f of ['mediapipe/wasm/vision_wasm_internal.wasm', 'mediapipe/wasm/vision_wasm_nosimd_internal.js', 'mediapipe/face_landmarker.task']) {
    const res = await request.get(f)
    expect(res.status(), f).toBe(200)
    expect((await res.body()).length, f).toBeGreaterThan(100_000)
  }
})

test('the service worker precaches the app shell only (not every symbol), and a deep link goes back to the app', async ({ page, context }) => {
  await page.addInitScript((seed) => localStorage.setItem('gapimiz.device', JSON.stringify(seed)), SEED)
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 }).catch(async () => {
    await page.reload()
  })
  const precached = await page.evaluate(async () => {
    const names = await caches.keys()
    const pre = names.find((n) => n.includes('precache'))
    return pre ? (await (await caches.open(pre)).keys()).map((r) => new URL(r.url).pathname) : []
  })
  const symbols = precached.filter((p) => p.includes('/symbols/'))
  expect(precached.length).toBeGreaterThan(20)
  expect(precached.length).toBeLessThan(260)
  expect(symbols.length).toBeLessThan(120)
  expect(precached.some((p) => p.includes('/audio/'))).toBe(false)
  expect(precached.some((p) => p.includes('/mediapipe/'))).toBe(false)

  // P-09: /foo/bar/ used to get index.html with ./assets URLs resolving under /foo/bar/ -> blank page
  const base = new URL('./', page.url()).href
  await page.goto(`${base}foo/bar/#/talk`)
  await expect(page).toHaveURL(`${base}#/talk`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  // and still offline
  await context.setOffline(true)
  await page.goto(`${base}g/foo/`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await context.setOffline(false)
})

test('the background pack fills the symbols cache', async ({ page }) => {
  // ~4500 audio clips + ~450 symbols are fetched three at a time: well over a minute on a cold run
  test.setTimeout(240_000)
  await page.addInitScript((seed) => localStorage.setItem('gapimiz.device', JSON.stringify(seed)), SEED)
  await page.goto('./')
  // the adult gate: hold for 1.5 s, then open "About"
  await page.evaluate(() => {
    location.hash = '#/parent'
  })
  const hold = page.getByRole('dialog').getByRole('button', { name: /Для взрослых/ })
  const box = (await hold.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await page.evaluate(() => {
    location.hash = '#/parent/about'
  })
  await page.waitForFunction(
    async () => {
      const c = await caches.open('symbols')
      return (await c.keys()).length > 300
    },
    null,
    { timeout: 120_000 },
  )
  await expect(page.getByText('Офлайн готов')).toBeVisible({ timeout: 120_000 })
})

test('every screen sets its own document title', async ({ page }) => {
  await page.addInitScript((seed) => localStorage.setItem('gapimiz.device', JSON.stringify(seed)), SEED)
  const titles = new Set<string>()
  for (const r of ['/', '/talk', '/day', '/timer', '/games', '/exercises']) {
    await page.goto(`./#${r}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    titles.add(await page.title())
  }
  expect(titles.size).toBeGreaterThanOrEqual(5)
  for (const t of titles) expect(t).toContain('Gapimiz')
})
