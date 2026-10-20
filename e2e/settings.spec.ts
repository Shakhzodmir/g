// Settings truth: every control of the adult-area Settings screen is driven through the REAL UI (the adult gate, then the
// control), then the place where it matters is opened and the observable effect is asserted, then the page is reloaded
// (persistence) and another profile is activated (per-profile behaviour).
//
// Run (dev server on 5262):  E2E_BASE_URL=http://localhost:5262/ npx playwright test e2e/settings.spec.ts --project=desktop
// The matrix of controls, storage and effects is in docs/settings-matrix.md.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { demoRows, deviceJson, seedApp } from './lib/seed.mjs'

test.skip(({ isMobile }) => isMobile, 'desktop layout only: the controls are the same on phones')
test.describe.configure({ mode: 'default' })

// ---------------------------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------------------------

type Opts = { device?: Record<string, unknown>; fakeVoices?: boolean; lang?: 'uz' | 'uzc' | 'ru'; kind?: 'child' | 'adult'; profile?: Record<string, unknown>; extraProfiles?: Array<Record<string, unknown>>; noIdb?: boolean; viewport?: { width: number; height: number } }

const SPY = `
  window.__plays = []; window.__spoken = []; window.__osc = 0; window.__rates = [];
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    window.__plays.push({ src: String(this.src), rate: this.playbackRate, volume: this.volume });
    return origPlay.call(this).catch(() => undefined);
  };
  if (window.speechSynthesis) {
    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => { window.__spoken.push({ text: u.text, rate: u.rate, volume: u.volume, lang: u.lang }); try { origSpeak(u) } catch {} };
  }
  const OrigOsc = window.AudioContext && window.AudioContext.prototype.createOscillator;
  if (OrigOsc) window.AudioContext.prototype.createOscillator = function () { window.__osc++; return OrigOsc.call(this); };
`

// A device with an Uzbek and a Russian system voice: speechSynthesis.speak is recorded and "finishes" at once.
const FAKE_VOICES = `
  (() => {
    const voices = [
      { lang: 'uz-UZ', name: 'Fake Uzbek', localService: true, default: false, voiceURI: 'fake-uz' },
      { lang: 'ru-RU', name: 'Fake Russian', localService: true, default: false, voiceURI: 'fake-ru' },
    ];
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.rate = 1; this.volume = 1; this.lang = ''; this.voice = null } };
    const synth = window.speechSynthesis;
    synth.getVoices = () => voices;
    synth.cancel = () => {};
    synth.speak = (u) => { window.__spoken.push({ text: u.text, rate: u.rate, volume: u.volume, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 20) };
  })();
`

async function start(page: Page, baseURL: string, o: Opts = {}) {
  if (o.fakeVoices) await page.addInitScript(SPY + FAKE_VOICES)
  if (o.viewport) await page.setViewportSize(o.viewport)
  if (o.noIdb) await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }) } catch { /* ignore */ } })
  if (!o.fakeVoices) await page.addInitScript(SPY)
  const rows = { ...demoRows('p-test'), profiles: (o.extraProfiles ?? []).map((p) => ({ avatar: 'musicha', speechLang: 'uz', speechLangFollowsUi: true, createdAt: 2, ...p })) }
  if (o.noIdb) {
    await page.addInitScript((j) => localStorage.setItem('gapimiz.device', j), deviceJson({ uiLang: o.lang ?? 'uz', activeProfileId: null }))
    await page.goto(baseURL, { waitUntil: 'load' })
  }
  else await seedApp(page, baseURL, { lang: o.lang ?? 'uz', kind: o.kind ?? 'child', profile: o.profile ?? {}, rows, device: o.device })
  await expect(page.locator('h1').first()).toBeVisible()
}

/** Goes to the adult area the way a person does: the gate, held for 1.5 s. */
async function throughGate(page: Page) {
  await page.evaluate(() => { location.hash = '#/parent' })
  const hold = page.getByRole('dialog').getByRole('button', { name: /Kattalar uchun|Для взрослых|Катталар учун/ })
  // Already inside the (unlocked) adult area: no gate to pass.
  if (!(await hold.isVisible().catch(() => false)) && !(await hold.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false))) return
  const box = (await hold.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function openSettings(page: Page) {
  await throughGate(page)
  await page.getByRole('button', { name: /^(Sozlamalar|Настройки|Созламалар)$/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Sozlamalar|Настройки|Созламалар/ })).toBeVisible()
}

async function openCards(page: Page) {
  await throughGate(page)
  await page.getByRole('button', { name: /^(Kartochkalar|Карточки|Карточкалар)$/ }).click()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
}

/** Leaves the adult area by its own nav (a person taps Home); the next screen is whatever route is asked for. */
async function visit(page: Page, hash: string) {
  await page.evaluate((h) => { location.hash = h }, hash)
  await expect(page.locator('h1').first()).toBeVisible()
  await page.waitForTimeout(250)
}

const switchOf = (page: Page, name: RegExp | string) => page.getByRole('switch', { name })
/** Uzbek text is shown with ‘ ’ instead of the data forms ʻ ʼ: matches both. */
const loose = (v: RegExp | string): RegExp | string =>
  typeof v === 'string' && /[ʻʼ]/.test(v)
    ? new RegExp([...v].map((c) => (/[ʻʼ]/.test(c) ? "[ʻʼ‘’']" : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join(''))
    : v
async function choose(page: Page, group: RegExp | string, option: RegExp | string) {
  const fs = page.getByRole('group', { name: loose(group) })
  await fs.getByText(option, { exact: typeof option === 'string' }).first().click()
}
async function setRange(page: Page, label: RegExp | string, value: number) {
  const input = page.getByLabel(loose(label), { exact: false }).and(page.locator('input[type=range]'))
  await input.fill(String(value))
}
async function setToggle(page: Page, label: RegExp | string, on: boolean) {
  const sw = switchOf(page, loose(label))
  if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', String(on))
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string; rate: number; volume: number; lang: string }> }).__spoken)
const plays = (page: Page) => page.evaluate(() => (window as unknown as { __plays: Array<{ src: string; rate: number; volume: number }> }).__plays)
const clearSpy = (page: Page) => page.evaluate(() => { const w = window as unknown as { __plays: unknown[]; __spoken: unknown[]; __osc: number }; w.__plays.length = 0; w.__spoken.length = 0; w.__osc = 0 })
const oscCount = (page: Page) => page.evaluate(() => (window as unknown as { __osc: number }).__osc)
const profileRow = (page: Page, id = 'p-test') =>
  page.evaluate(
    (id) =>
      new Promise<Record<string, any> | null>((resolve) => {
        const r = indexedDB.open('gapimiz')
        r.onsuccess = () => {
          const g = r.result.transaction('profiles').objectStore('profiles').get(id)
          g.onsuccess = () => { r.result.close(); resolve(g.result ?? null) }
        }
      }),
    id,
  )
const htmlAttr = (page: Page, a: string) => page.evaluate((a) => document.documentElement.getAttribute(a), a)
const cssVar = (page: Page, v: string) => page.evaluate((v) => document.documentElement.style.getPropertyValue(v), v)
const coreCells = (page: Page) => page.locator('button[data-label][data-color]')
const barChips = (page: Page) => page.locator('[class$="_chip"]')

async function reload(page: Page) {
  await page.reload({ waitUntil: 'load' })
  await expect(page.locator('h1').first()).toBeVisible()
}

async function switchProfile(page: Page, nameRe: RegExp) {
  await throughGate(page)
  await page.getByRole('button', { name: /^(Profillar|Профили|Профиллар)$/ }).click()
  await page.getByRole('button', { name: nameRe }).click()
  await page.waitForTimeout(200)
}

// ---------------------------------------------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------------------------------------------

const THEMES = [
  ['Bolajon', 'bolajon'],
  ['Tun', 'tun'],
  ['Tinch', 'tinch'],
  ['Kattalar', 'kattalar'],
  ['Kontrast, oq', 'hc-light'],
  ['Kontrast, qora', 'hc-dark'],
] as const

test('theme: every one of the 6 themes changes html[data-theme] and the real colours, persists, and is per profile', async ({ page, baseURL }) => {
  await start(page, baseURL!, { extraProfiles: [{ id: 'p-two', name: 'Madina', kind: 'adult', theme: 'kattalar' }] })
  await openSettings(page)
  const seen = new Set<string>()
  for (const [label, id] of THEMES) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect.poll(() => htmlAttr(page, 'data-theme')).toBe(id)
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    seen.add(bg)
    // the tab-bar colour follows the theme too
    expect(await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content'))).toBeTruthy()
    expect((await profileRow(page))?.theme).toBe(id)
  }
  expect(seen.size).toBeGreaterThanOrEqual(4) // bolajon/tinch/kattalar are close, but dark and both contrast themes differ
  await page.getByRole('button', { name: 'Tun', exact: true }).click()
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await reload(page)
  expect(await htmlAttr(page, 'data-theme')).toBe('tun')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(dark)
  // another profile keeps its own theme
  await switchProfile(page, /Madina — tanlash/)
  expect(await htmlAttr(page, 'data-theme')).toBe('kattalar')
  await switchProfile(page, /Aziz — tanlash/)
  expect(await htmlAttr(page, 'data-theme')).toBe('tun')
})

// ---------------------------------------------------------------------------------------------------------------
// Sensory level
// ---------------------------------------------------------------------------------------------------------------

test('sensory: calm = no running animations and no sound effects, normal/festive bring them back; per profile; persists', async ({ page, baseURL }) => {
  await start(page, baseURL!, { extraProfiles: [{ id: 'p-two', name: 'Madina', kind: 'adult', sensory: 'festive' }] })
  await openSettings(page)
  await choose(page, 'Sezgi darajasi', 'Tinch')
  await expect.poll(() => htmlAttr(page, 'data-sensory')).toBe('calm')
  await visit(page, '#/')
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !(a.effect as KeyframeEffect | null)?.target?.closest?.('[data-no-motion]')).length)
  await page.waitForTimeout(500)
  expect(await running(), 'no CSS animation is running in calm mode').toBe(0)
  // effects are silent in calm: the drum of the syllables game must not start an oscillator
  await visit(page, '#/games/syllables')
  await clearSpy(page)
  await page.getByRole('button', { name: 'Barabanni chal' }).click()
  await page.waitForTimeout(300)
  expect(await oscCount(page), 'calm: no sfx oscillator').toBe(0)
  await reload(page)
  expect(await htmlAttr(page, 'data-sensory')).toBe('calm')
  expect((await profileRow(page))?.sensory).toBe('calm')
  // normal brings the effects back
  await openSettings(page)
  await choose(page, 'Sezgi darajasi', /Oʻrtacha|O‘rtacha/)
  await expect.poll(() => htmlAttr(page, 'data-sensory')).toBe('normal')
  await visit(page, '#/games/syllables')
  await clearSpy(page)
  await page.getByRole('button', { name: 'Barabanni chal' }).click()
  await page.waitForTimeout(300)
  expect(await oscCount(page), 'normal: the drum makes a sound effect').toBeGreaterThan(0)
  // the other profile has its own level
  await switchProfile(page, /Madina — tanlash/)
  expect(await htmlAttr(page, 'data-sensory')).toBe('festive')
})

test('sensory: the OS reduced-motion preference wins over the profile (documented override)', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page, baseURL!, { profile: { sensory: 'festive' } })
  expect(await htmlAttr(page, 'data-sensory')).toBe('calm')
  expect((await profileRow(page))?.sensory).toBe('festive') // the saved choice is untouched
})

// ---------------------------------------------------------------------------------------------------------------
// Touch accommodations (read by <Pressable>, so they apply to every button of the app)
// ---------------------------------------------------------------------------------------------------------------

async function centre(loc: Locator) {
  const b = (await loc.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

test('touch: activate-on-release — pressing alone does nothing, releasing speaks; switched off, the press acts at once; persists', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await expect(switchOf(page, /Barmoq koʻtarilganda|Barmoq ko‘tarilganda/)).toHaveAttribute('aria-checked', 'true')
  await visit(page, '#/talk')
  const cell = coreCells(page).first()
  const { x, y } = await centre(cell)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await expect(barChips(page)).toHaveCount(0)
  await page.mouse.up()
  await expect(barChips(page)).toHaveCount(1)
  // switch it off
  await openSettings(page)
  await setToggle(page, /Barmoq ko.tarilganda/, false)
  await reload(page)
  expect((await profileRow(page))?.touch.activateOnRelease).toBe(false)
  await visit(page, '#/talk')
  const before = await barChips(page).count() // the message of this session survives the reload
  const c2 = await centre(coreCells(page).nth(1))
  await page.mouse.move(c2.x, c2.y)
  await page.mouse.down()
  await page.waitForTimeout(150)
  await expect(barChips(page), 'pressed (not yet released) already activated').toHaveCount(before + 1)
  await page.mouse.up()
  await page.waitForTimeout(200)
  await expect(barChips(page), 'the click after the press is swallowed, no double activation').toHaveCount(before + 1)
})

test('touch: hold time 1000 ms — a tap does nothing, a 1.2 s press speaks; persists', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await setRange(page, 'Bosib turish vaqti', 1000)
  await expect(page.getByText('1 s', { exact: true }).first()).toBeVisible() // localised value next to the slider
  expect((await profileRow(page))?.touch.holdMs).toBe(1000)
  await reload(page)
  await visit(page, '#/talk')
  const { x, y } = await centre(coreCells(page).first())
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(120)
  await page.mouse.up()
  await page.waitForTimeout(300)
  await expect(barChips(page), 'a short tap is ignored').toHaveCount(0)
  await page.mouse.down()
  await page.waitForTimeout(1250)
  await page.mouse.up()
  await expect(barChips(page), 'a long press is accepted').toHaveCount(1)
})

test('touch: ignore repeated presses — the second tap on the same cell inside the window is ignored; other cells are not', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await setRange(page, 'Takroriy bosishni', 1000)
  expect((await profileRow(page))?.touch.ignoreRepeatMs).toBe(1000)
  await visit(page, '#/talk')
  const cells = coreCells(page)
  await cells.nth(0).click()
  await page.waitForTimeout(150)
  await cells.nth(0).click()
  await expect(barChips(page), 'same cell twice in 150 ms: one word').toHaveCount(1)
  await cells.nth(1).click()
  await expect(barChips(page), 'another cell is never blocked').toHaveCount(2)
  await page.waitForTimeout(1100)
  await cells.nth(0).click()
  await expect(barChips(page), 'after the window the same cell works again').toHaveCount(3)
  // and with the guard off, a quick double tap adds two words
  await openSettings(page)
  await setRange(page, 'Takroriy bosishni', 0)
  await visit(page, '#/talk')
  await page.getByRole('button', { name: /Hammasini tozalash/ }).click()
  await cells.nth(0).click()
  await cells.nth(0).click()
  await expect(barChips(page)).toHaveCount(2)
})

test('touch: dwell 500 ms — hovering with the mouse activates the cell, off by default', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await visit(page, '#/talk')
  const first = await centre(coreCells(page).first())
  await page.mouse.move(first.x, first.y)
  await page.waitForTimeout(900)
  await expect(barChips(page), 'dwell is off by default').toHaveCount(0)
  await openSettings(page)
  await setRange(page, /Ko.rsatib turib/, 500)
  expect((await profileRow(page))?.touch.dwellMs).toBe(500)
  await reload(page)
  await visit(page, '#/talk')
  const c = await centre(coreCells(page).first())
  await page.mouse.move(c.x + 3, c.y + 3)
  await page.mouse.move(c.x, c.y)
  await page.waitForTimeout(250)
  await expect(barChips(page)).toHaveCount(0)
  await page.waitForTimeout(500)
  await expect(barChips(page), 'hover for 500 ms speaks the word').toHaveCount(1)
})

// ---------------------------------------------------------------------------------------------------------------
// Switch scanning
// ---------------------------------------------------------------------------------------------------------------

const highlighted = (page: Page) => page.evaluate(() => document.querySelector('.is-scan-target')?.getAttribute('aria-label') ?? document.querySelector('.is-scan-target')?.textContent ?? null)

test('scanning: auto mode moves a highlight by itself and Space selects it; interval slider only in auto; persists', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await expect(page.getByLabel('Skanerlash oraligʻi').or(page.getByLabel(/Skanerlash orali/)).first()).toHaveCount(0) // hidden while the mode is off
  await choose(page, 'Rejim', 'Avto, 1 tugma')
  await setRange(page, /Skanerlash orali/, 500)
  expect(await profileRow(page)).toMatchObject({ scanning: { mode: 'auto1', intervalMs: 500 } })
  await reload(page)
  await visit(page, '#/talk')
  const seen = new Set<string>()
  const t0 = Date.now()
  while (Date.now() - t0 < 4000 && seen.size < 3) {
    const h = await highlighted(page)
    if (h) seen.add(h)
    await page.waitForTimeout(80)
  }
  expect(seen.size, `the highlight moved through ${[...seen].join(' | ')}`).toBeGreaterThanOrEqual(2)
  // Space selects the highlighted item: wait for the "Kun tartibi" nav item and press Space on it
  const t1 = Date.now()
  while (Date.now() - t1 < 8000 && (await highlighted(page)) !== 'Kun tartibi') await page.waitForTimeout(40)
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(/#\/day/)
  // off again: nothing is highlighted any more
  await openSettings(page)
  await choose(page, 'Rejim', 'Oʻchiq|O.chiq'.length ? /O.chiq/ : 'x')
  await visit(page, '#/talk')
  await page.waitForTimeout(1500)
  expect(await highlighted(page)).toBeNull()
})

test('scanning: step mode — Space moves one step, Enter selects', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await choose(page, 'Rejim', 'Qadam, 2 tugma')
  await visit(page, '#/talk')
  await page.waitForTimeout(600)
  const a = await highlighted(page)
  expect(a).toBeTruthy()
  await page.waitForTimeout(1500)
  expect(await highlighted(page), 'does not move by itself').toBe(a)
  await page.keyboard.press('Space')
  const b = await highlighted(page)
  expect(b).not.toBe(a)
  // walk to "Kun tartibi" and select it with Enter (the 300 ms repeat guard also applies to the switch)
  for (let i = 0; i < 40 && (await highlighted(page)) !== 'Kun tartibi'; i++) {
    await page.waitForTimeout(330)
    await page.keyboard.press('Space')
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/day/)
})

test('scanning: the audio cue speaks the name of the highlighted item (only when switched on)', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await choose(page, 'Rejim', 'Qadam, 2 tugma')
  await visit(page, '#/talk')
  await clearSpy(page)
  await page.keyboard.press('Space')
  await page.waitForTimeout(200)
  expect((await spoken(page)).length, 'cue is off by default').toBe(0)
  await openSettings(page)
  await setToggle(page, 'Har bir bandni ovoz bilan aytish', true)
  expect((await profileRow(page))?.scanning.audioCue).toBe(true)
  await visit(page, '#/talk')
  await clearSpy(page)
  let label: string | null = null
  for (let i = 0; i < 40 && !(await spoken(page)).length; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(330)
  }
  label = await highlighted(page)
  const said = await spoken(page)
  expect(said.length, 'speechSynthesis.speak was called').toBeGreaterThan(0)
  expect(said.map((s) => s.text)).toContain(label)
})

// ---------------------------------------------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------------------------------------------

test('voice: speed and volume reach the audio element of the spoken clip; persist', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await setRange(page, 'Gapirish tezligi', 1.4)
  await setRange(page, 'Ovoz balandligi', 0.5)
  await expect(page.getByText('×1,4')).toBeVisible() // decimal comma in the UI
  await expect(page.getByText('50%').first()).toBeVisible()
  expect((await profileRow(page))?.voice).toMatchObject({ rate: 1.4, volume: 0.5 })
  await reload(page)
  await visit(page, '#/talk')
  await clearSpy(page)
  await coreCells(page).first().click()
  await expect.poll(async () => (await plays(page)).length).toBeGreaterThan(0)
  const p = (await plays(page))[0]
  expect(p.src).toMatch(/audio\/uz\//)
  expect(p.rate).toBeCloseTo(1.4, 2)
  expect(p.volume).toBeCloseTo(0.5, 2)
  // slow: 0.6
  await openSettings(page)
  await setRange(page, 'Gapirish tezligi', 0.6)
  await visit(page, '#/talk')
  await clearSpy(page)
  await coreCells(page).nth(2).click()
  await expect.poll(async () => (await plays(page)).length).toBeGreaterThan(0)
  expect((await plays(page))[0].rate).toBeCloseTo(0.6, 2)
})

test('voice: "prefer the device voice" — with a device voice the word goes to speechSynthesis at the chosen speed, without it the bundled clip plays', async ({ page, baseURL }) => {
  await start(page, baseURL!, { fakeVoices: true })
  await visit(page, '#/talk')
  await clearSpy(page)
  await coreCells(page).first().click()
  await expect.poll(async () => (await plays(page)).length + (await spoken(page)).length).toBeGreaterThan(0)
  expect((await spoken(page)).length, 'default: the bundled clip, not the device voice').toBe(0)
  await openSettings(page)
  await setToggle(page, /Qurilma ovozini afzal/, true)
  await setRange(page, 'Gapirish tezligi', 1.2)
  expect((await profileRow(page))?.voice.preferSystem).toBe(true)
  await visit(page, '#/talk')
  await clearSpy(page)
  await coreCells(page).nth(3).click()
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
  const u = (await spoken(page))[0]
  expect(u.rate).toBeCloseTo(1.2, 2)
  expect(u.lang).toMatch(/uz/i)
  expect((await plays(page)).length).toBe(0)
})

test('voice: effects volume — 0 plays no sound effect, more plays one (calm still silent)', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await setRange(page, 'Effektlar balandligi', 0)
  expect((await profileRow(page))?.voice.sfxVolume).toBe(0)
  await visit(page, '#/games/syllables')
  await clearSpy(page)
  await page.getByRole('button', { name: 'Barabanni chal' }).click()
  await page.waitForTimeout(300)
  expect(await oscCount(page), 'sfx volume 0: no oscillator').toBe(0)
  await openSettings(page)
  await setRange(page, 'Effektlar balandligi', 0.8)
  await visit(page, '#/games/syllables')
  await clearSpy(page)
  await page.getByRole('button', { name: 'Barabanni chal' }).click()
  await page.waitForTimeout(300)
  expect(await oscCount(page), 'sfx volume 0.8: the drum sounds').toBeGreaterThan(0)
})

test('voice: "Ovozni sinash" speaks a sample with the current rate and volume', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await setRange(page, 'Gapirish tezligi', 0.8)
  await clearSpy(page)
  await page.getByRole('button', { name: 'Ovozni sinash' }).click()
  await expect.poll(async () => (await plays(page)).length).toBeGreaterThan(0)
  expect((await plays(page))[0].rate).toBeCloseTo(0.8, 2)
})

// ---------------------------------------------------------------------------------------------------------------
// Text size
// ---------------------------------------------------------------------------------------------------------------

test('text size: 150 % scales the root font-size and the layout, persists, and is per profile', async ({ page, baseURL }) => {
  await start(page, baseURL!, { extraProfiles: [{ id: 'p-two', name: 'Madina', kind: 'adult' }] })
  const rootPx = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  const base = await rootPx()
  await visit(page, '#/talk')
  const h0 = (await coreCells(page).first().boundingBox())!.height
  await openSettings(page)
  await choose(page, 'Matn oʻlchami', '150%')
  expect(await rootPx()).toBeCloseTo(base * 1.5, 1)
  expect(await htmlAttr(page, 'data-tscale')).toBe('big')
  expect((await profileRow(page))?.textScale).toBe(1.5)
  // the real text on the page grows, not only the variable
  const body = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main')!).fontSize))
  expect(body).toBeGreaterThan(base * 1.4)
  await reload(page)
  expect(await rootPx()).toBeCloseTo(base * 1.5, 1)
  await visit(page, '#/talk')
  // cells are sized in rem/px from the container: they must still fit on screen (no horizontal page scroll)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  expect(h0).toBeGreaterThan(0)
  await switchProfile(page, /Madina — tanlash/)
  expect(await rootPx(), 'the other profile keeps 100 %').toBeCloseTo(base, 1)
  await switchProfile(page, /Aziz — tanlash/)
  expect(await rootPx()).toBeCloseTo(base * 1.5, 1)
  // back to 100 %
  await openSettings(page)
  await choose(page, 'Matn oʻlchami', '100%')
  expect(await rootPx()).toBeCloseTo(base, 1)
})

// ---------------------------------------------------------------------------------------------------------------
// Communicator (AAC) settings: level, labels, colour coding, hidden words
// ---------------------------------------------------------------------------------------------------------------

test('AAC level: 1 / 2 / 3 show 9 / 18 / 36 core words at fixed places; persists; per profile', async ({ page, baseURL }) => {
  await start(page, baseURL!, { extraProfiles: [{ id: 'p-two', name: 'Madina', kind: 'adult', aac: { level: 3 } }] })
  await visit(page, '#/talk')
  expect(await coreCells(page).count(), 'default child level 2').toBe(18)
  const firstLabel = await coreCells(page).first().getAttribute('aria-label')
  await openCards(page)
  await choose(page, 'Asosiy soʻzlar darajasi', /^1 — /)
  await visit(page, '#/talk')
  expect(await coreCells(page).count()).toBe(9)
  expect(await coreCells(page).first().getAttribute('aria-label'), 'words never move').toBe(firstLabel)
  await openCards(page)
  await choose(page, 'Asosiy soʻzlar darajasi', /^3 — /)
  await visit(page, '#/talk')
  expect(await coreCells(page).count()).toBe(36)
  await reload(page)
  expect((await profileRow(page))?.aac.level).toBe(3)
  await openCards(page)
  await choose(page, 'Asosiy soʻzlar darajasi', /^1 — /)
  await switchProfile(page, /Madina — tanlash/)
  await visit(page, '#/talk')
  expect(await coreCells(page).count(), 'the other profile has its own level').toBe(36)
})

test('AAC labels: off / top / bottom change the cells and the message bar; colour coding changes the cell colours; persist', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await visit(page, '#/talk')
  const labelCount = () => page.locator('button[data-label] [class$="_cellLabel"]').count()
  expect(await labelCount()).toBeGreaterThan(0)
  expect(await coreCells(page).first().getAttribute('data-label')).toBe('bottom')
  const cellColor = (i: number) => coreCells(page).nth(i).evaluate((e) => getComputedStyle(e).backgroundColor)
  // pick a coloured cell that differs from the first one
  const colored = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map((i) => cellColor(i)))
  expect(new Set(colored).size, 'colour coding on: cells have different colours').toBeGreaterThan(1)
  await openSettings(page)
  await choose(page, 'Kartochka yozuvlari', 'Tepada')
  await visit(page, '#/talk')
  expect(await coreCells(page).first().getAttribute('data-label')).toBe('top')
  const topRect = await coreCells(page).first().evaluate((e) => {
    const l = e.querySelector('[class$="_cellLabel"]')!.getBoundingClientRect()
    const s = e.querySelector('[class$="_cellSymbol"]')!.getBoundingClientRect()
    return l.top < s.top
  })
  expect(topRect, 'the label is above the picture').toBe(true)
  await openSettings(page)
  await choose(page, 'Kartochka yozuvlari', /^Yo.q$/)
  await visit(page, '#/talk')
  expect(await labelCount(), 'no label text at all').toBe(0)
  expect(await coreCells(page).first().getAttribute('aria-label'), 'the accessible name stays').toBeTruthy()
  await coreCells(page).first().click()
  expect(await page.locator('[class$="_chipLabel"]').count(), 'message bar chips follow the label setting').toBe(0)
  await reload(page)
  expect((await profileRow(page))?.aac).toMatchObject({ showLabels: false })
  await openSettings(page)
  await choose(page, 'Kartochka yozuvlari', 'Pastda')
  // colour coding off
  await setToggle(page, /Soʻz turlari|So.z turlari/, false)
  await visit(page, '#/talk')
  expect(await coreCells(page).first().getAttribute('data-color')).toBe('false')
  const flat = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map((i) => cellColor(i)))
  expect(new Set(flat).size, 'colour coding off: all cells have one colour').toBe(1)
  await reload(page)
  expect((await profileRow(page))?.aac.colorCoding).toBe(false)
})

test('AAC hidden words: a hidden word disappears from the board (its place stays empty) and from topic boards; "show all" brings it back', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await visit(page, '#/talk')
  const before = await coreCells(page).count()
  const names = await coreCells(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  const victim = names[3]!
  await openCards(page)
  await page.getByRole('button', { name: new RegExp(`«${victim}» — yashirish`) }).click()
  await expect(page.getByText('Yashirilgan soʻzlar: 1').or(page.getByText(/Yashirilgan so.zlar: 1/))).toBeVisible()
  await visit(page, '#/talk')
  expect(await coreCells(page).count()).toBe(before - 1)
  expect(await page.getByRole('button', { name: victim, exact: true }).count()).toBe(0)
  // the others did not move: same order minus the hidden one
  const after = await coreCells(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(after).toEqual(names.filter((n) => n !== victim))
  await reload(page)
  expect((await profileRow(page))?.aac.hiddenWordIds.length).toBe(1)
  await openCards(page)
  await page.getByRole('button', { name: /Hammasini ko.rsatish/ }).click()
  await visit(page, '#/talk')
  expect(await coreCells(page).count()).toBe(before)
})


// ---------------------------------------------------------------------------------------------------------------
// Language: ONE choice (the UI language); the speech language follows; a separate speech language is an advanced override
// ---------------------------------------------------------------------------------------------------------------

test('language: switching the interface language translates everything and the app speaks it at once (all profiles that follow)', async ({ page, baseURL }) => {
  await start(page, baseURL!, { extraProfiles: [{ id: 'p-two', name: 'Madina', kind: 'adult' }] })
  await visit(page, '#/talk')
  const uzLabel = await coreCells(page).first().getAttribute('aria-label')
  await openSettings(page)
  await page.getByText('Русский', { exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru')
  expect(await page.evaluate(() => document.title)).toMatch(/Gapimiz/)
  // no question is asked any more; the speech language moved with the interface
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(async () => (await profileRow(page))?.speechLang).toBe('ru')
  await expect.poll(async () => (await profileRow(page, 'p-two'))?.speechLang, 'the other profile follows too, in storage').toBe('ru')
  await visit(page, '#/talk')
  const ruLabel = await coreCells(page).first().getAttribute('aria-label')
  expect(ruLabel).not.toBe(uzLabel)
  expect(ruLabel).toMatch(/[А-Яа-яЁё]/)
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Главная' })).toBeVisible()
  await clearSpy(page)
  await coreCells(page).first().click()
  await expect.poll(async () => (await plays(page)).length).toBeGreaterThan(0)
  expect((await plays(page))[0].src).toMatch(/audio\/ru\//)
  // Uzbek Cyrillic
  await openSettings(page)
  await page.getByText('Ўзбекча (кирилл)', { exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Созламалар' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('uz-Cyrl')
  await expect.poll(async () => (await profileRow(page))?.speechLang).toBe('uz')
  await visit(page, '#/talk')
  expect(await coreCells(page).first().getAttribute('aria-label')).toMatch(/[А-Яа-яЎўҚқҒғҲҳ]/)
  await reload(page)
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('uz-Cyrl')
  // the other profile is in sync after a reload as well
  expect((await profileRow(page, 'p-two'))?.speechLang).toBe('uz')
})

test('language: the separate speech language is an advanced override — off by default, kept when the interface language changes, off again snaps back', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  const sw = switchOf(page, /Ovoz tili alohida/)
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('group', { name: /Gapirish tili/ })).toHaveCount(0) // hidden until the override is on
  await sw.click()
  await expect(page.getByRole('group', { name: /Gapirish tili/ })).toBeVisible()
  await expect(page.getByText(/Ovoz tili interfeys tilidan farq qilishi mumkin/)).toBeVisible()
  await choose(page, /Gapirish tili/, 'Ruscha')
  await expect.poll(async () => profileRow(page)).toMatchObject({ speechLang: 'ru', speechLangFollowsUi: false })
  // the interface stays Uzbek, the words are Russian
  await visit(page, '#/talk')
  expect(await coreCells(page).first().getAttribute('aria-label')).toMatch(/[А-Яа-яЁё]/)
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Bosh sahifa' })).toBeVisible()
  await clearSpy(page)
  await coreCells(page).first().click()
  await expect.poll(async () => (await plays(page)).length).toBeGreaterThan(0)
  expect((await plays(page))[0].src).toMatch(/audio\/ru\//)
  // changing the interface language does not touch the override
  await openSettings(page)
  await page.getByText('Ўзбекча (кирилл)', { exact: true }).click()
  expect((await profileRow(page))?.speechLang).toBe('ru')
  await reload(page)
  expect(await profileRow(page)).toMatchObject({ speechLang: 'ru', speechLangFollowsUi: false })
  // switching the override off follows the interface language again (now Uzbek Cyrillic -> uz)
  await openSettings(page)
  await switchOf(page, /Овоз тили алоҳида/).click()
  await expect.poll(async () => (await profileRow(page))?.speechLang).toBe('uz')
  expect((await profileRow(page))?.speechLangFollowsUi).toBe(true)
})

// ---------------------------------------------------------------------------------------------------------------
// PIN, reset, in-memory mode
// ---------------------------------------------------------------------------------------------------------------

test('PIN: set in Settings, asked after the 1.5 s hold, wrong PIN refused, right PIN opens, removable', async ({ page, baseURL }) => {
  await start(page, baseURL!)
  await openSettings(page)
  await page.getByLabel('Yangi PIN (4–6 raqam)').fill('2468')
  await page.getByLabel('PINni takrorlang').fill('2468')
  await page.getByRole('button', { name: 'PINni saqlash' }).click()
  await expect(page.getByText('PIN saqlandi.')).toBeVisible()
  await reload(page)
  await page.evaluate(() => { location.hash = '#/parent' })
  const hold = page.getByRole('dialog').getByRole('button', { name: /Kattalar uchun/ })
  const b = (await hold.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByLabel(/PIN-kodni kiriting/)).toBeVisible()
  await page.getByLabel(/PIN-kodni kiriting/).fill('1111')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/PIN-kod mos kelmadi/)).toBeVisible()
  await page.getByLabel(/PIN-kodni kiriting/).fill('2468')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^Sozlamalar$/ }).click()
  await page.getByRole('button', { name: /PINni o.chirish/ }).click()
  await expect(page.getByText('PIN olib tashlandi.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gapimiz.device')!).state.parentPinHash)).toBeNull()
})

test('reset to defaults restores every setting of the screen (not the name, hidden words or recordings)', async ({ page, baseURL }) => {
  await start(page, baseURL!, {
    profile: {
      theme: 'hc-dark',
      sensory: 'festive',
      textScale: 1.75,
      touch: { activateOnRelease: false, holdMs: 700, ignoreRepeatMs: 900, dwellMs: 1000 },
      scanning: { mode: 'auto1', intervalMs: 3000, audioCue: true },
      voice: { rate: 1.3, preferSystem: true, volume: 0.3, sfxVolume: 0, musicVolume: 0 },
      aac: { level: 3, showLabels: false, labelPos: 'top', colorCoding: false, hiddenWordIds: ['water'] },
      speechLang: 'ru',
      speechLangFollowsUi: false,
    },
  })
  expect(await htmlAttr(page, 'data-theme')).toBe('hc-dark')
  await openSettings(page)
  await page.getByRole('button', { name: 'Standart sozlamalarga qaytarish' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Qaytarish' }).click()
  await expect(page.getByText('Sozlamalar standartga qaytarildi.')).toBeVisible()
  await expect.poll(() => htmlAttr(page, 'data-theme')).toBe('bolajon')
  await expect
    .poll(async () => profileRow(page))
    .toMatchObject({
      name: 'Aziz',
      theme: 'bolajon',
      sensory: 'normal',
      textScale: 1,
      speechLang: 'uz',
      speechLangFollowsUi: true,
      touch: { activateOnRelease: true, holdMs: 0, ignoreRepeatMs: 300, dwellMs: 0 },
      scanning: { mode: 'off', intervalMs: 1500, audioCue: false },
      voice: { rate: 1, preferSystem: false, volume: 1, sfxVolume: 0.6 },
      aac: { level: 2, showLabels: true, labelPos: 'bottom', colorCoding: true, hiddenWordIds: ['water'] },
    })
  expect(await htmlAttr(page, 'data-sensory')).toBe('normal')
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(16, 0)
})

test('in-memory mode (no IndexedDB): settings still change the app at once, and the adult area says nothing is saved', async ({ page, baseURL }) => {
  await start(page, baseURL!, { noIdb: true })
  await openSettings(page)
  await expect(page.getByText(/Brauzer ma.lumotni saqlashga ruxsat bermayapti/)).toBeVisible()
  await page.getByRole('button', { name: 'Tun', exact: true }).click()
  await expect.poll(() => htmlAttr(page, 'data-theme')).toBe('tun')
  await choose(page, 'Sezgi darajasi', 'Tinch')
  await expect.poll(() => htmlAttr(page, 'data-sensory')).toBe('calm')
  await choose(page, 'Matn oʻlchami', '125%')
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(20, 0)
  await setRange(page, 'Bosib turish vaqti', 1000)
  await visit(page, '#/talk')
  const n0 = await barChips(page).count()
  const { x, y } = await centre(coreCells(page).first())
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(100)
  await page.mouse.up()
  await page.waitForTimeout(250)
  expect(await barChips(page).count(), 'hold time works without storage').toBe(n0)
})

// ---------------------------------------------------------------------------------------------------------------
// Board (whiteboard) mode: Settings toggle, /board-setup fields, preview, teacher rail, three screen sizes
// ---------------------------------------------------------------------------------------------------------------

const FHD = { width: 1920, height: 1080 }
const deviceState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gapimiz.device')!).state)
const rootPx = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
const rail = (page: Page) => page.getByRole('complementary', { name: /Oʻqituvchi paneli|O.qituvchi paneli/ })
const boardSwitch = (page: Page) => page.getByRole('switch', { name: 'Doska rejimi' })
async function openBoardSetupFromSettings(page: Page) {
  await page.getByRole('button', { name: 'Doskani sozlash' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Doska rejimi' })).toBeVisible()
}

test('board: the Settings switch and the setup page are one setting; exiting restores the normal layout; persists', async ({ page, baseURL }) => {
  await start(page, baseURL!, { viewport: FHD })
  expect(await htmlAttr(page, 'data-board')).toBe('false')
  const navLeftNormal = (await page.locator('nav[aria-label="Gapimiz"]').boundingBox())!
  await openSettings(page)
  await expect(boardSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await boardSwitch(page).click()
  await expect.poll(() => htmlAttr(page, 'data-board')).toBe('true')
  expect(Number(await cssVar(page, '--ui-scale'))).toBeGreaterThan(1)
  expect(Number(await cssVar(page, '--reach'))).toBeGreaterThan(0.1)
  expect((await deviceState(page)).boardMode).toBe(true)
  expect((await deviceState(page)).boardCalibration, 'switching on stores a calibration derived from the screen').toBeTruthy()
  // the setup page shows the same state
  await openBoardSetupFromSettings(page)
  await expect(boardSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await visit(page, '#/')
  await expect(rail(page)).toBeVisible() // teacher rail only in board mode
  const navBoard = (await page.locator('nav[aria-label="Gapimiz"]').boundingBox())!
  expect(navBoard.y, 'board mode: the navigation is a bar at the bottom').toBeGreaterThan(FHD.height - navBoard.height - 2)
  await reload(page)
  expect(await htmlAttr(page, 'data-board')).toBe('true')
  // switch off on the setup page
  await visit(page, '#/board-setup')
  await boardSwitch(page).click()
  await expect.poll(() => htmlAttr(page, 'data-board')).toBe('false')
  expect(await cssVar(page, '--ui-scale'), 'the board scale variable is removed').toBe('')
  expect(await cssVar(page, '--reach')).toBe('')
  await expect(rail(page)).toHaveCount(0)
  expect(await rootPx(page), 'normal text size is back').toBeCloseTo(16, 0)
  const navBack = (await page.locator('nav[aria-label="Gapimiz"]').boundingBox())!
  expect(Math.abs(navBack.x - navLeftNormal.x) + Math.abs(navBack.y - navLeftNormal.y) + Math.abs(navBack.width - navLeftNormal.width)).toBeLessThan(2)
  await reload(page)
  expect(await htmlAttr(page, 'data-board')).toBe('false')
  expect((await deviceState(page)).boardMode).toBe(false)
  // and the Settings switch agrees
  await openSettings(page)
  await expect(boardSwitch(page)).toHaveAttribute('aria-checked', 'false')
})

test('board: every setup field changes the real layout at once (while board mode is on) and is stored', async ({ page, baseURL }) => {
  await start(page, baseURL!, {
    viewport: FHD,
    device: { boardMode: true, calibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.2, reach: 0.5 } },
  })
  await visit(page, '#/board-setup')
  await expect(page.getByText(/darhol qoʻllanadi|darhol qo.llanadi/)).toBeVisible()
  const reach0 = Number(await cssVar(page, '--reach'))
  expect(Number(await cssVar(page, '--ui-scale'))).toBeCloseTo(1.2, 1)
  // scale slider -> --ui-scale and the root font-size
  await setRange(page, 'Interfeys kattaligi', 1.4)
  await expect.poll(async () => Number(await cssVar(page, '--ui-scale'))).toBeCloseTo(1.4, 1)
  expect(await rootPx(page)).toBeCloseTo(16 * 1.4, 0)
  await expect.poll(async () => (await deviceState(page)).boardCalibration.scale).toBeCloseTo(1.4, 1)
  // children's age: 3–4 reach less far than adults
  await choose(page, 'Bolalar yoshi', '3–4')
  await expect.poll(async () => Number(await cssVar(page, '--reach'))).toBeLessThan(reach0)
  const reachSmall = Number(await cssVar(page, '--reach'))
  expect((await deviceState(page)).boardCalibration.ageGroup).toBe('3-4')
  await choose(page, 'Bolalar yoshi', 'Kattalar')
  await expect.poll(async () => Number(await cssVar(page, '--reach'))).toBeGreaterThan(reachSmall)
  // the bottom edge higher above the floor -> less reach
  const reachAdult = Number(await cssVar(page, '--reach'))
  await setRange(page, 'Ekranning pastki cheti', 110)
  await expect.poll(async () => Number(await cssVar(page, '--reach'))).toBeLessThan(reachAdult)
  expect((await deviceState(page)).boardCalibration.bottomEdgeM).toBeCloseTo(1.1, 2)
  // a bigger screen -> the same height from the floor is a smaller share of it
  const reach110 = Number(await cssVar(page, '--reach'))
  await setRange(page, 'Ekranning pastki cheti', 60)
  await choose(page, 'Ekran oʻlchami', '86″')
  const reach86 = Number(await cssVar(page, '--reach'))
  await choose(page, 'Ekran oʻlchami', '55″')
  const reach55 = Number(await cssVar(page, '--reach'))
  expect(reach55, 'a smaller screen is reached over a bigger share of its height').toBeGreaterThan(reach86)
  expect(reach110).toBeGreaterThan(0)
  expect((await deviceState(page)).boardCalibration.diagonalIn).toBe(55)
  // distance -> the suggestion changes, "apply suggestion" puts the slider on it
  await setRange(page, 'Eng uzoqdagi bola', 2)
  const lowSuggestion = await page.getByText(/Tavsiya: /).first().innerText()
  await setRange(page, 'Eng uzoqdagi bola', 9)
  const highSuggestion = await page.getByText(/Tavsiya: /).first().innerText()
  expect(highSuggestion).not.toBe(lowSuggestion)
  await setRange(page, 'Interfeys kattaligi', 1.1)
  await page.getByRole('button', { name: /Tavsiyani qo.llash/ }).click()
  const wanted = Number(highSuggestion.replace(/[^0-9,]/g, '').replace(',', '.'))
  await expect.poll(async () => (await deviceState(page)).boardCalibration.scale).toBeCloseTo(Math.min(wanted, 1.5), 1)
  expect((await deviceState(page)).boardCalibration.distanceM).toBe(9)
  await reload(page)
  expect((await deviceState(page)).boardCalibration).toMatchObject({ diagonalIn: 55, distanceM: 9, ageGroup: 'adult' })
  expect(Number(await cssVar(page, '--reach'))).toBeCloseTo(reach55, 2)
})

test('board: "preview in board mode" shows the draft before anything is stored; back to the form or save', async ({ page, baseURL }) => {
  await start(page, baseURL!, { viewport: FHD })
  await visit(page, '#/board-setup')
  await expect(page.getByRole('button', { name: /Doska rejimida ko.rish/ })).toBeVisible()
  await choose(page, 'Bolalar yoshi', '3–4')
  await setRange(page, 'Interfeys kattaligi', 1.3)
  await page.getByRole('button', { name: /Doska rejimida ko.rish/ }).click()
  await expect.poll(() => htmlAttr(page, 'data-board')).toBe('true')
  await expect(page.getByRole('region', { name: /Doska rejimida ko.rish/ })).toBeVisible()
  expect(Number(await cssVar(page, '--ui-scale'))).toBeCloseTo(1.3, 1)
  expect((await deviceState(page)).boardMode, 'nothing is stored by a preview').toBe(false)
  expect((await deviceState(page)).boardCalibration).toBeNull()
  // a reload during the preview returns to the stored (normal) settings
  await reload(page)
  expect(await htmlAttr(page, 'data-board')).toBe('false')
  // preview again, go back to the form: board mode is off again and the form is shown
  await visit(page, '#/board-setup')
  await page.getByRole('button', { name: /Doska rejimida ko.rish/ }).click()
  await page.getByRole('button', { name: 'Sozlashga qaytish' }).click()
  await expect(page).toHaveURL(/#\/board-setup/)
  await expect.poll(() => htmlAttr(page, 'data-board')).toBe('false')
  // preview and save
  await page.getByRole('button', { name: /Doska rejimida ko.rish/ }).click()
  await page.getByRole('region').getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('region', { name: /Doska rejimida ko.rish/ })).toHaveCount(0)
  expect(await deviceState(page)).toMatchObject({ boardMode: true })
  await reload(page)
  expect(await htmlAttr(page, 'data-board')).toBe('true')
})

test('board: the teacher rail — quiet mode for this session only, exit restores the normal layout', async ({ page, baseURL }) => {
  await start(page, baseURL!, { viewport: FHD, profile: { sensory: 'festive' }, device: { boardMode: true, calibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.4, reach: 0.5 } } })
  await expect(rail(page)).toBeVisible()
  expect(await htmlAttr(page, 'data-sensory')).toBe('festive')
  await rail(page).getByRole('button', { name: 'Tinch rejim' }).click()
  await expect.poll(() => htmlAttr(page, 'data-sensory')).toBe('calm')
  expect((await profileRow(page))?.sensory, 'the saved level is never overwritten').toBe('festive')
  await page.waitForTimeout(400) // the repeat guard ignores a second press on the same button inside 300 ms
  await rail(page).getByRole('button', { name: 'Tinch rejim' }).click()
  await expect.poll(() => htmlAttr(page, 'data-sensory')).toBe('festive')
  await rail(page).getByRole('button', { name: 'Doska rejimidan chiqish' }).click()
  await expect.poll(() => htmlAttr(page, 'data-board')).toBe('false')
  await expect(rail(page)).toHaveCount(0)
  expect(await rootPx(page)).toBeCloseTo(16, 0)
  expect((await deviceState(page)).boardMode).toBe(false)
})

for (const [name, vp, calib] of [
  ['laptop 1366x768', { width: 1366, height: 768 }, { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 }],
  ['full HD 1920x1080', { width: 1920, height: 1080 }, { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 }],
  ['4K 3840x2160', { width: 3840, height: 2160 }, { diagonalIn: 86, bottomEdgeM: 0.7, ageGroup: '3-4', distanceM: 6, scale: 2.4, reach: 0.4 }],
] as const) {
  test(`board layout at ${name}: nothing overflows, the bar and the teacher rail stay in view, the reach zone is bottom-aligned`, async ({ page, baseURL }) => {
    await start(page, baseURL!, { viewport: vp, device: { boardMode: true, calibration: calib } })
    const slug = name.replace(/\s.*/, '').replace(/[^a-z0-9]/gi, '')
    for (const route of ['#/', '#/talk', '#/board-setup']) {
      await visit(page, route)
      await page.waitForTimeout(400)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${route} horizontal overflow`).toBeLessThanOrEqual(1)
      const nav = (await page.locator('nav[aria-label="Gapimiz"]').boundingBox())!
      expect(nav.y + nav.height, `${route}: the bottom bar is inside the screen`).toBeLessThanOrEqual(vp.height + 1)
      expect(nav.y, `${route}: the bottom bar is at the bottom`).toBeGreaterThan(vp.height * 0.8)
      const r = (await rail(page).boundingBox())!
      expect(r.x + r.width).toBeLessThanOrEqual(vp.width + 1)
      expect(r.y).toBeGreaterThanOrEqual(0)
      await page.screenshot({ path: `e2e/.shots/board-${slug}${route.replace(/[^a-z]/g, '_')}.png` })
    }
    // the talk screen's primary zone is capped by the reach and sits right above the bar
    await visit(page, '#/talk')
    const zone = await page.evaluate(() => {
      const el = document.querySelector('[data-reach]') as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      const nav = document.querySelector('nav')!.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, navTop: nav.top, vh: innerHeight }
    })
    expect(zone, 'a [data-reach] zone exists on the talk screen').not.toBeNull()
    expect(zone!.bottom).toBeLessThanOrEqual(zone!.navTop + 1)
    expect(zone!.navTop - zone!.bottom, 'the zone sits right above the bar').toBeLessThan(vp.height * 0.08)
  })
}
