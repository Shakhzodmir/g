// Games-hub age/count chips, scrolling topic tabs with card counts, the "continue" card and the voice level meter,
// measured in the real layout (phone and desktop; Uzbek, Cyrillic Uzbek and Russian; normal and 200% text).
//
// Run (dev server on 5272):  E2E_BASE_URL=http://localhost:5272/ npx playwright test e2e/labels.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { deviceJson, seedApp } from './lib/seed.mjs'

// The fake microphone of the last block is an oscillator: let Chromium start audio without a gesture.
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

type Lang = 'uz' | 'uzc' | 'ru'
const LANGS: Lang[] = ['uz', 'uzc', 'ru']

async function start(page: Page, baseURL: string, o: { lang?: Lang; kind?: 'child' | 'adult'; rows?: Record<string, unknown[]>; device?: Record<string, unknown>; big?: boolean } = {}) {
  await seedApp(page, baseURL, { lang: o.lang ?? 'uz', kind: o.kind ?? 'child', rows: o.rows ?? {}, device: o.device })
  if (o.big) {
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  }
}

/** Boxes of text that stick out of their own box or out of the viewport (inside the page, not in a scroller). */
async function clipped(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const out: string[] = []
    const vw = window.innerWidth
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.textContent} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`)
      // glyphs of tall fonts overshoot a tight line box by a few px without being cut off: that is not clipping
      const tolerance = Math.max(4, 0.12 * parseFloat(getComputedStyle(el).fontSize))
      if (el.scrollHeight > el.clientHeight + tolerance) out.push(`${el.textContent} scrollHeight ${el.scrollHeight} > ${el.clientHeight}`)
      const li = el.closest('li')?.getBoundingClientRect()
      if (li && (r.left < li.left - 1 || r.right > li.right + 1)) out.push(`${el.textContent} leaves its column ${Math.round(r.left)}..${Math.round(r.right)} vs ${Math.round(li.left)}..${Math.round(li.right)}`)
      if (r.left < -1 || r.right > vw + 1) out.push(`${el.textContent} leaves the viewport`)
    }
    return out
  }, selector)
}

/** The screens fade/slide in with a spring; measure once they have settled (a real overflow never settles away). */
async function expectNoClipping(page: Page, selector: string) {
  await expect.poll(() => clipped(page, selector), { timeout: 5000, message: `boxes of ${selector} must fit` }).toEqual([])
}

test.describe('games hub: age and count chips', () => {
  for (const lang of LANGS) {
    for (const big of [false, true]) {
      test(`${lang}${big ? ' / 200% text' : ''}: every tile has its chips and none is clipped`, async ({ page, baseURL }) => {
        await start(page, baseURL!, { lang, big })
        await page.goto('#/games')
        const chips = page.locator('[data-testid^="chips-"]')
        await expect(chips.first()).toBeVisible()
        expect(await chips.count()).toBeGreaterThan(8)
        // a child sees an age and a count on every tile
        for (const el of await chips.all()) expect(await el.locator('span').count()).toBe(2)
        await expectNoClipping(page, '[data-testid^="chips-"] span')
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
      })
    }
  }

  test('the visible text is the real number (Russian plural forms, no placeholders)', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'ru' })
    await page.goto('#/games')
    await expect(page.locator('[data-testid^="chips-"]').first()).toBeVisible()
    const text = (await page.locator('[data-testid^="chips-"]').allInnerTexts()).join(' / ')
    expect(text).not.toMatch(/[{}|]/)
    expect(text).toMatch(/\d–\d (года|лет)/)
    expect(text).toMatch(/\d+ (слов|слова|слово|картин|заданий|задания|задание|пар|чисел|категор)/)
  })

  test('an adult sees the count only (no age)', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'ru', kind: 'adult' })
    await page.goto('#/games')
    const chips = page.locator('[data-testid^="chips-"]')
    await expect(chips.first()).toBeVisible()
    for (const el of await chips.all()) expect(await el.locator('span').count()).toBe(1)
    await expectNoClipping(page, '[data-testid^="chips-"] span')
  })

  test('the tile stays one tap target and its name carries the label', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz' })
    await page.goto('#/games')
    const tile = page.getByRole('button', { name: /^Chapak-chapak, \d+–\d+ yosh · \d+ ta so/ })
    await expect(tile).toBeVisible()
    await tile.click()
    await expect(page).toHaveURL(/#\/games\/syllables/)
  })
})

test.describe('talk: scrolling topic tabs with card counts', () => {
  test('every topic is reachable, the count is on the tab and in its name', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'ru' })
    await page.goto('#/talk')
    const nav = page.getByRole('navigation', { name: 'Темы' })
    await expect(nav).toBeVisible()
    const tabs = nav.getByRole('button')
    expect(await tabs.count()).toBeGreaterThan(15)
    // the core tab carries the number of words on the board (level 2 child = 18)
    await expect(nav.getByRole('button', { name: /Главные слова, 18 слов/ })).toBeVisible()
    // a topic tab shows the number in its corner; the phrases tab (not a topic) has none
    await expect(nav.getByRole('button', { name: /^Еда, \d+ слов/ })).toContainText(/\d/)
    await expect(nav.getByRole('button', { name: 'Готовые фразы' })).not.toContainText(/\d/)
  })

  test('the strip scrolls and says so: a "more" arrow appears, it moves the strip, and a "back" arrow follows', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz' })
    await page.goto('#/talk')
    const more = page.getByRole('button', { name: 'Yana mavzular' })
    await expect(more).toBeVisible()
    await expect(page.getByRole('button', { name: 'Oldingi mavzular' })).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Mavzular' })
    const pos = () => nav.evaluate((el) => (getComputedStyle(el).flexDirection === 'column' ? el.scrollTop : el.scrollLeft))
    expect(await pos()).toBe(0)
    await more.click()
    await expect.poll(pos).toBeGreaterThan(40)
    await expect(page.getByRole('button', { name: 'Oldingi mavzular' })).toBeVisible()
    // the page itself never scrolls sideways
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })

  test('a deep link opens with its tab in view', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz' })
    await page.goto('#/talk?topic=weather')
    const nav = page.getByRole('navigation', { name: 'Mavzular' })
    const active = nav.locator('[aria-pressed="true"]')
    await expect(active).toHaveCount(1)
    await expect(active).toBeInViewport({ ratio: 0.95 })
  })

  test('at 200% text the tab names wrap and nothing is clipped', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'ru', big: true })
    await page.goto('#/talk')
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await expectNoClipping(page, '[role="navigation"] button span:nth-child(2)')
  })
})

test.describe('home: continue where we stopped', () => {
  const now = Date.now()
  const rows = (kind: 'child' | 'adult') => ({
    events: [
      { profileId: 'p-test', type: 'game_round', ref: kind === 'child' ? 'syllables' : 'naming', ts: now - 60_000, meta: { ok: true, level: 2 } },
      { profileId: 'p-test', type: 'game_round', ref: 'find', ts: now - 3_600_000, meta: { ok: true, level: 1 } },
    ],
  })

  for (const lang of LANGS) {
    test(`${lang}: the child home offers the last game and opens it`, async ({ page, baseURL }) => {
      await start(page, baseURL!, { lang, rows: rows('child') })
      const card = page.getByTestId('continue')
      await expect(card).toBeVisible()
      await expectNoClipping(page, '[data-testid="continue"] span')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
      await card.getByRole('button').click()
      await expect(page).toHaveURL(/#\/games\/syllables/)
    })
  }

  test('the card is one big target (at least 64 px tall) and sits above the plates', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz', rows: rows('child') })
    const btn = page.getByTestId('continue').getByRole('button')
    const box = (await btn.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(64)
    const firstPlate = (await page.getByRole('main').locator('ul[role="list"] li').first().boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(firstPlate.y + 1)
  })

  test('adult home: a compact row, adult game title, no child-only game', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'ru', kind: 'adult', rows: rows('adult') })
    const card = page.getByTestId('continue')
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('data-variant', 'adult')
    await expect(card.getByRole('button')).toContainText('Называние')
  })

  test('nothing is shown for a profile without history', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz' })
    await page.waitForTimeout(500)
    await expect(page.getByTestId('continue')).toHaveCount(0)
  })

  test('200% text on a small phone: the name wraps inside the card', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await start(page, baseURL!, { lang: 'ru', rows: rows('child'), big: true })
    await expect(page.getByTestId('continue')).toBeVisible()
    await expectNoClipping(page, '[data-testid="continue"] span')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
  })

  test('whiteboard: the card stays in the reach zone together with the tiles', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await start(page, baseURL!, {
      lang: 'uz',
      rows: rows('child'),
      device: { boardMode: true, boardCalibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 } },
    })
    const btn = page.getByTestId('continue').getByRole('button')
    await expect(btn).toBeVisible()
    const b = (await btn.boundingBox())!
    expect(b.y + b.height).toBeLessThanOrEqual(1080)
    expect(b.width).toBeGreaterThan(300)
  })
})

test.describe('microphone games: "we hear you" level bar', () => {
  /**
   * A fake microphone: a tone that is silent while the app measures the room (that measurement must hear a quiet room),
   * and switched on by the test afterwards through `window.__micGain`.
   */
  const FAKE_MIC = () => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext()
      await ctx.resume().catch(() => undefined)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0
      ;(window as unknown as { __micGain: GainNode }).__micGain = gain
      const dest = ctx.createMediaStreamDestination()
      osc.frequency.value = 220
      osc.connect(gain).connect(dest)
      osc.start()
      return dest.stream
    }
  }
  const sound = (page: Page, on: boolean) => page.evaluate((v) => ((window as unknown as { __micGain: GainNode }).__micGain.gain.value = v ? 0.35 : 0), on)

  for (const route of ['#/exercises/voice', '#/exercises/blow']) {
    test(`${route}: the bar fills while sound arrives and exposes a meter role`, async ({ page, baseURL }) => {
      await page.addInitScript(FAKE_MIC)
      await start(page, baseURL!, { lang: 'uz', kind: 'adult' })
      await page.goto(route)
      await page.getByRole('button', { name: 'Mikrofonni yoqish' }).click()
      const meter = page.getByRole('meter', { name: 'Tovush darajasi' })
      // the meter appears when the room is measured and the microphone listens; it starts empty
      await expect(meter).toBeVisible({ timeout: 15_000 })
      await expect(meter).toHaveAttribute('aria-valuenow', '0')
      await expect(meter).toHaveAttribute('aria-valuetext', 'Hozircha jimjit')
      await sound(page, true)
      await expect.poll(async () => Number(await meter.getAttribute('aria-valuenow')), { timeout: 15_000 }).toBeGreaterThan(0)
      await expect(meter).toHaveAttribute('aria-valuetext', 'Tovush eshitilyapti')
      const box = (await meter.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(24)
      expect(box.width).toBeGreaterThanOrEqual(96)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
      // when the sound stops, the bar falls back to empty (slowly, never stuck)
      await sound(page, false)
      await expect.poll(async () => Number(await meter.getAttribute('aria-valuenow')), { timeout: 10_000 }).toBe(0)
    })
  }

  test('no microphone: no meter, the hold button is there', async ({ page, baseURL }) => {
    await start(page, baseURL!, { lang: 'uz' })
    await page.goto('#/exercises/blow')
    await page.getByRole('button', { name: 'Mikrofonsiz' }).click()
    await expect(page.getByRole('button', { name: 'Bosib turing' })).toBeVisible()
    await expect(page.getByRole('meter')).toHaveCount(0)
  })
})

// keep the helper import used even when every test above is filtered out
void deviceJson
