// "Nutq tekshiruvi / Проверка речи" (adult area, /parent/check): the real UI, end to end.
//   finish a child screening -> plan -> tick today's task -> history + retest schedule after faking dates -> the "consider a
//   specialist" screen; the one-page report and the user-initiated sharing; a second profile has its own data;
//   no horizontal overflow at 320 px and 200 % text.
//
// Run (dev server on 5271):  E2E_BASE_URL=http://localhost:5271/ npx playwright test e2e/check.spec.ts --project=desktop
import { expect, test, type Page } from '@playwright/test'
import { demoCheckRows } from './lib/checkRows.mjs'
import { seedApp } from './lib/seed.mjs'

test.skip(({ isMobile }) => isMobile, 'desktop project only: the screens are the same on phones, the gate needs a mouse hold')
test.describe.configure({ mode: 'default' })

/** The clock the app sees = real time + localStorage['e2e.offset'] ms. Lets a test "wait 8 days" without waiting. */
const FAKE_CLOCK = `(() => {
  const R = Date
  const off = () => { try { return Number(localStorage.getItem('e2e.offset') || 0) } catch { return 0 } }
  class F extends R {
    constructor(...a) { if (a.length === 0) super(R.now() + off()); else super(...a) }
    static now() { return R.now() + off() }
  }
  window.Date = F
})()`
const DAY = 86_400_000
const travel = (page: Page, days: number) => page.evaluate((ms) => localStorage.setItem('e2e.offset', String(ms)), days * DAY)

/** What the share / open / print buttons do is recorded instead of leaving the page. */
const SPIES = `
  window.__shared = null; window.__opened = null; window.__printed = 0;
  navigator.share = async (d) => { window.__shared = d };
  window.open = (u) => { window.__opened = String(u); return null };
  window.print = () => { window.__printed++ };
`

async function start(page: Page, baseURL: string, o: { kind?: 'child' | 'adult'; rows?: Record<string, unknown[]>; spies?: boolean; lang?: 'uz' | 'uzc' | 'ru' } = {}) {
  await page.addInitScript(FAKE_CLOCK)
  if (o.spies) await page.addInitScript(SPIES)
  await seedApp(page, baseURL, { lang: o.lang ?? 'uz', kind: o.kind ?? 'child', rows: o.rows ?? {} })
  await expect(page.locator('h1').first()).toBeVisible()
}

/** Holds the adult gate for 1.5 s the way a person does. A no-op when the area is already open. */
async function passGate(page: Page) {
  const hold = page.getByRole('dialog').getByRole('button', { name: /Kattalar uchun|Для взрослых|Катталар учун/ })
  const open = page.getByText(/Kattalar bo.limi ochiq|Раздел для взрослых открыт|Катталар бўлими очиқ/)
  // the first load of a lazy screen can be slow on a busy dev server: wait for either the gate or the open area
  const which = await Promise.race([
    hold.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'gate' as const, () => 'none' as const),
    open.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'open' as const, () => 'none' as const),
  ])
  if (which !== 'gate') return
  const box = (await hold.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** Parent area home -> the "Nutq tekshiruvi" card (the way a parent finds it). With `due`, a repeat check is due: its banner appears above the cards a moment after load. */
async function openCheck(page: Page, due = false) {
  await page.evaluate(() => { location.hash = '#/parent' })
  await passGate(page)
  if (due) await expect(page.getByTestId('retest-banner').first()).toBeVisible()
  await page.getByRole('button', { name: /^(Nutq tekshiruvi|Проверка речи|Нутқ текшируви)/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Nutq tekshiruvi|Проверка речи|Нутқ текшируви/ })).toBeVisible()
}

const loadingGone = (page: Page) => expect(page.getByText(/^(Yuklanmoqda|Загрузка)/)).toHaveCount(0)

async function answerAll(page: Page, total: number, valueOf: (i: number) => 0 | 1 | 2) {
  for (let i = 0; i < total; i++) {
    await expect(page.getByTestId('progress')).toHaveText(new RegExp(`${i + 1}\\s*/\\s*${total}`))
    await page.locator(`[data-answer="${valueOf(i)}"]`).click()
  }
}

/** Rows in the  table of the open database. */
const idbCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open('gapimiz')
        r.onsuccess = () => {
          const c = r.result.transaction('checks').objectStore('checks').count()
          c.onsuccess = () => { r.result.close(); resolve(c.result) }
        }
      }),
  )

test('a child screening from start to plan, tick, history and the retest schedule after faking dates', async ({ page, baseURL }) => {
  test.setTimeout(150_000)
  await start(page, baseURL!, { kind: 'child' })
  await openCheck(page)
  await loadingGone(page)

  // hub: three screenings, a privacy note and the disclaimer
  await expect(page.locator('[data-check]')).toHaveCount(3)
  await expect(page.getByText(/Hech narsa avtomatik yuborilmaydi|Ничего не отправляется автоматически/)).toBeVisible()
  await expect(page.getByText(/Bu tibbiy tashxis emas|Это не медицинский диагноз/).first()).toBeVisible()
  await page.locator('[data-check="child"]').click()

  // overview without a result yet
  await expect(page.getByText(/Hali natija yo/)).toBeVisible()
  await page.getByRole('button', { name: /^Tekshiruvni boshlash/ }).click()

  // age -> what worries you -> quick screen (5) with one "no" on the fluency question
  await page.locator('[data-age="3-4"]').click()
  const next = page.getByRole('button', { name: /^Keyingi/ })
  await expect(next).toBeDisabled()
  await page.locator('[data-concern="fluency"]').click()
  await expect(page.locator('[data-concern="fluency"]')).toHaveAttribute('aria-pressed', 'true')
  await next.click()
  await answerAll(page, 5, (i) => (i === 3 ? 0 : 2))

  // quick result: "let's look closer" (never a verdict), then the detailed assessment narrowed to fluency (3 questions)
  await expect(page.getByRole('heading', { name: /Keling, yaqinroq qaraymiz/ })).toBeVisible()
  await page.getByRole('button', { name: /^Batafsil baholash/ }).click()
  await answerAll(page, 3, () => 0)

  // result screen: bands with icon + text, the disclaimer, no percentage and no "risk"
  await expect(page.getByRole('heading', { name: /^Natija$/ })).toBeVisible()
  const disclaimer = page.getByTestId('disclaimer')
  await expect(disclaimer).toContainText('Bu tibbiy tashxis emas.')
  const row = page.locator('li', { hasText: /Ravon gapirish/ }).first()
  await expect(row).toContainText(/E.tibor kerak/)
  await expect(row.locator('svg')).toHaveCount(1)
  const body = (await page.locator('main').innerText()).toLowerCase()
  expect(body).not.toMatch(/\d\s?%/)
  expect(body).not.toMatch(/risk|xavf/)

  // the plan: 15 minutes, tasks from the weakest domain, a tick for "done today"
  await page.getByRole('button', { name: /Bugungi rejani/ }).click()
  await expect(page.getByRole('heading', { name: /Bugungi reja: 15 daq/ })).toBeVisible()
  const tasks = page.getByTestId('plan-task')
  expect(await tasks.count()).toBeGreaterThanOrEqual(2)
  expect(await tasks.count()).toBeLessThanOrEqual(5)
  await expect(page.getByTestId('plan-task').first()).toContainText(/Ravon gapirish/)
  const first = tasks.first()
  await first.getByRole('button', { name: /Bajarildi deb belgilash/ }).click()
  await expect(first.getByRole('button', { pressed: true })).toBeVisible()
  await expect(page.getByTestId('streak')).toContainText('1')
  await expect(page.getByText(/Bugun bajarildi/).first()).toBeVisible()

  // history and the 7 / 14 / 30 day schedule
  await expect(page.getByTestId('history-row')).toHaveCount(1)
  const ms = page.getByTestId('milestones').locator('li')
  await expect(ms).toHaveCount(3)
  await expect(ms.nth(0)).toContainText(/Rejaning 7-kuni/)
  await expect(ms.nth(1)).toContainText(/Rejaning 14-kuni/)
  await expect(ms.nth(2)).toContainText(/Rejaning 30-kuni/)
  await expect(page.getByTestId('retest-banner')).toHaveCount(0)
  expect(await idbCount(page)).toBe(1)

  // ---- 8 days later: the banner is due (in the app only); the tick is no longer "today", the streak has ended
  await travel(page, 8)
  await page.reload({ waitUntil: 'load' })
  await openCheck(page, true)
  await loadingGone(page)
  await expect(page.getByTestId('retest-banner')).toContainText(/Rejaning 7-kuni/)
  await page.getByTestId('retest-banner').getByRole('button', { name: /Tekshiruvni ochish/ }).click()
  // a repeat of a detailed check goes straight to the same domain (age is remembered)
  await expect(page.locator('[data-age="3-4"]')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-age="3-4"]').click()
  await answerAll(page, 3, () => 2)
  await expect(page.getByTestId('outcome-improved')).toContainText(/Yaxshi yangilik/)
  await expect(page.getByTestId('disclaimer')).toBeVisible()
  await page.getByRole('button', { name: /Bugungi rejani/ }).click()
  await expect(page.getByTestId('history-row')).toHaveCount(2)
  await expect(page.getByTestId('milestones').locator('li').nth(0)).toHaveAttribute('data-state', 'done')
  await expect(page.getByTestId('milestones').locator('li').nth(1)).toHaveAttribute('data-state', 'upcoming')
  await expect(page.getByTestId('retest-banner')).toHaveCount(0)
  await expect(page.getByTestId('streak')).toContainText('0')

  // ---- day 16: the day-14 mark is due; a repeat check that does not improve points calmly to a specialist
  await travel(page, 16)
  await page.reload({ waitUntil: 'load' })
  await openCheck(page, true)
  await loadingGone(page)
  await expect(page.getByTestId('retest-banner')).toContainText(/Rejaning 14-kuni/)
  await page.locator('[data-check="child"]').click()
  await page.getByRole('button', { name: /^Qayta tekshirish/ }).click()
  await page.locator('[data-age="3-4"]').click()
  await answerAll(page, 3, () => 0)
  const spec = page.getByTestId('outcome-specialist')
  await expect(spec).toContainText(/Mutaxassisga murojaat qilishni/)
  await expect(page.getByTestId('where-to-turn')).toContainText(/Logoped/)
  await expect(page.getByTestId('disclaimer')).toContainText('Bu tibbiy tashxis emas.')
  await expect(page.getByTestId('outcome-improved')).toHaveCount(0)
  // the "where to turn" page is built elsewhere: a plain link to /parent/help (the adult area shows its home until it exists)
  await spec.getByRole('button', { name: /Qayerga murojaat qilish/ }).click()
  await expect.poll(() => page.url()).toContain('#/parent/help')
})

test('the communication check says plainly that it is not a diagnosis, then plans and shows the same bands', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await start(page, baseURL!, { kind: 'child' })
  await openCheck(page)
  await page.locator('[data-check="asd"]').click()
  await page.getByRole('button', { name: /^Tekshiruvni boshlash/ }).click()
  // before any question: calm wording, "not a diagnosis", "a validated instrument and a specialist assess"
  const intro = page.locator('main')
  await expect(intro).toContainText(/autizmni aniqlamaydi/)
  await expect(intro).toContainText(/validatsiyadan o.tgan/)
  await expect(page.locator('[data-age]')).toHaveCount(4) // ages 1-2 ... 4-5
  await page.locator('[data-age="2-3"]').click()
  await answerAll(page, 18, (i) => (i >= 6 && i < 9 ? 0 : 2)) // the pointing domain gets three "no"
  await expect(page.getByRole('heading', { name: /^Natija$/ })).toBeVisible()
  await expect(page.getByTestId('disclaimer')).toContainText(/autizmni aniqlamaydi/)
  await expect(page.locator('li', { hasText: /Ishora qilish/ }).first()).toContainText(/E.tibor kerak/)
  await expect(page.locator('li', { hasText: /Ismga javob/ }).first()).toContainText(/Yaxshi/)
  await page.getByRole('button', { name: /Bugungi rejani/ }).click()
  await expect(page.getByTestId('plan-task').first()).toContainText(/Ishora qilish/)
})

test('an adult screening has its own questions and a plan that links to the training and voice screens', async ({ page, baseURL }) => {
  test.setTimeout(90_000)
  await start(page, baseURL!, { kind: 'adult' })
  // one tool card on the adult home leads here (through the adult gate)
  await page.locator('[data-tool="check"]').click()
  await passGate(page)
  await expect(page.getByRole('heading', { level: 1, name: /Nutq tekshiruvi/ })).toBeVisible()
  await expect(page.locator('[data-check]').first()).toHaveAttribute('data-check', 'adult') // recommended first
  await page.locator('[data-check="adult"]').click()
  await page.getByRole('button', { name: /^Tekshiruvni boshlash/ }).click()
  await expect(page.getByRole('heading', { name: /Kattalar uchun savollar/ })).toBeVisible()
  await page.getByRole('button', { name: /^Boshlash/ }).click()
  // words (3), clarity (3) and fluency (3) get "sometimes"/"no"; the rest "yes"
  await answerAll(page, 18, (i) => (i >= 3 && i < 6 ? 0 : i >= 9 && i < 12 ? 1 : 2))
  await expect(page.getByRole('heading', { name: /^Natija$/ })).toBeVisible()
  await expect(page.locator('li', { hasText: /Soʻz topish|So.z topish/ }).first()).toContainText(/E.tibor kerak/)
  await expect(page.locator('li', { hasText: /Ravon gapirish/ }).first()).toContainText(/Kuzatamiz/)
  await page.getByRole('button', { name: /Bugungi rejani/ }).click()
  const open = page.getByTestId('plan-task').getByRole('button', { name: /Ilovada ochish/ }).first()
  await expect(open).toBeVisible()
  await open.click()
  await expect.poll(() => page.url()).toMatch(/#\/(games|exercises|talk|day|timer|calm)/)
})

test('the report page renders one A4 sheet, and nothing is sent unless a button is pressed', async ({ page, context, baseURL }) => {
  test.setTimeout(90_000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL!).origin })
  await start(page, baseURL!, { kind: 'child', rows: demoCheckRows('p-test'), spies: true })
  await openCheck(page, true)
  await loadingGone(page)
  await page.locator('[data-check="child"]').click()
  await page.getByRole('button', { name: /^Hisobot va ulashish/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Hisobot$/ })).toBeVisible()
  // opening the page sent nothing
  expect(await page.evaluate(() => (window as unknown as { __shared: unknown; __opened: unknown }).__shared)).toBeNull()
  expect(await page.evaluate(() => (window as unknown as { __opened: unknown }).__opened)).toBeNull()

  // the sheet: both languages, bands in words, the disclaimer, no percentages, no "risk"
  const sheet = page.getByTestId('report-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('Bu tibbiy tashxis emas.')
  await expect(sheet).toContainText('Это не медицинский диагноз.')
  await expect(sheet).toContainText(/Kuzatamiz/)
  await expect(sheet).toContainText(/Наблюдаем/)
  await expect(sheet.locator('tr')).not.toHaveCount(0)
  const sheetText = (await sheet.innerText()).toLowerCase()
  expect(sheetText).not.toMatch(/\d\s?%/)
  expect(sheetText).not.toMatch(/risk|xavf|риск/)

  // the shared text is previewed, and the name is NOT in it until the adult turns it on
  const preview = page.getByTestId('share-text')
  await expect(preview).toContainText('Bu tibbiy tashxis emas.')
  await expect(preview).toContainText('Это не медицинский диагноз.')
  await expect(preview).not.toContainText('Aziz')
  await expect(sheet).not.toContainText('Aziz')
  await page.getByRole('switch', { name: /ismni/ }).click()
  await expect(preview).toContainText('Aziz')
  await expect(sheet).toContainText('Aziz')
  const text = (await preview.textContent())!.trim()

  // Web Share
  await page.getByRole('button', { name: /^Ulashish/ }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: { text: string } | null }).__shared?.text)).toBe(text)
  // copy
  await page.getByRole('button', { name: /^Matnni nusxalash/ }).click()
  await expect(page.getByTestId('share-status')).toContainText(/Nusxalandi/)
  // the Windows clipboard turns LF into CRLF: compare without line breaks
  const strip = (v: string) => v.replace(/\s+/g, ' ').trim()
  expect(strip(await page.evaluate(() => navigator.clipboard.readText()))).toBe(strip(text))
  // Telegram link (opened only now, in a new tab, with the text in the URL)
  await page.getByRole('button', { name: /^Telegramda yuborish/ }).click()
  const opened = (await page.evaluate(() => (window as unknown as { __opened: string | null }).__opened))!
  expect(opened).toMatch(/^https:\/\/t\.me\/share\/url\?url=/)
  const u = new URL(opened)
  expect(u.searchParams.get('text')).toBe(text)
  expect(u.searchParams.get('url')).toMatch(/^http/)
  // print button
  await page.getByRole('button', { name: /^Chop etish/ }).click()
  expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)

  // print layout: only the sheet is printed, on exactly one A4 page
  await page.emulateMedia({ media: 'print' })
  await expect(sheet).toBeVisible()
  await expect(preview).toBeHidden()
  await expect(page.getByRole('button', { name: /^Chop etish/ })).toBeHidden()
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
  expect(pages).toBe(1)
})

test('another profile has its own checks, and the first profile keeps hers', async ({ page, baseURL }) => {
  test.setTimeout(120_000)
  const bek = { id: 'p-b', name: 'Bek', avatar: 'musicha', kind: 'adult', speechLang: 'uz', speechLangFollowsUi: true, createdAt: 2 }
  await start(page, baseURL!, { kind: 'adult', rows: { ...demoCheckRows('p-test'), profiles: [bek] } })
  const status = (kind: string) => page.locator(`[data-check="${kind}"]`)

  // Madina (p-test): all three screenings have results, the communication one has its retest due
  await page.locator('[data-tool="check"]').click()
  await passGate(page)
  await loadingGone(page)
  await expect(status('child')).toContainText(/Oxirgi tekshiruv/)
  await expect(status('asd')).toContainText(/Takroriy tekshiruv vaqti keldi/)
  await expect(status('adult')).toContainText(/Oxirgi tekshiruv/)
  await expect(page.getByTestId('retest-banner')).toHaveCount(1)

  // switch to Bek on the adult home
  const switchTo = async (name: RegExp) => {
    await page.evaluate(() => { location.hash = '#/' })
    await page.getByRole('button', { name: /^Profil: / }).click()
    await page.getByRole('dialog').getByRole('button', { name }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await switchTo(/^Bek/)
  await page.locator('[data-tool="check"]').click()
  await passGate(page)
  await loadingGone(page)
  for (const k of ['child', 'asd', 'adult']) await expect(status(k)).toContainText(/Hali topshirilmagan/)
  await expect(page.getByTestId('retest-banner')).toHaveCount(0)

  // Bek takes the adult check (all "yes")
  await status('adult').click()
  await page.getByRole('button', { name: /^Tekshiruvni boshlash/ }).click()
  await page.getByRole('button', { name: /^Boshlash/ }).click()
  await answerAll(page, 18, () => 2)
  await expect(page.getByRole('heading', { name: /^Natija$/ })).toBeVisible()
  await page.getByRole('button', { name: /Bugungi rejani/ }).click()
  await expect(page.getByTestId('history-row')).toHaveCount(1)
  await expect(page.getByTestId('history-row')).toContainText(/Hech bir sohada/)

  // back to Madina: untouched (her own adult result still needs attention in one domain, her child history has 2 rows)
  await switchTo(/^Madina/)
  await page.locator('[data-tool="check"]').click()
  await passGate(page)
  await loadingGone(page)
  await expect(status('child')).toContainText(/Oxirgi tekshiruv/)
  await expect(status('asd')).toContainText(/Takroriy tekshiruv vaqti keldi/)
  await status('adult').click()
  await expect(page.getByTestId('history-row')).toHaveCount(1)
  await expect(page.getByTestId('history-row')).toContainText(/E.tibor kerak: 1 ta soha/)
  await page.getByRole('button', { name: /Orqaga/ }).click()
  await status('child').click()
  await expect(page.getByTestId('history-row')).toHaveCount(2)
})

test('the data of one screening can be deleted from the device', async ({ page, baseURL }) => {
  await start(page, baseURL!, { kind: 'child', rows: demoCheckRows('p-test') })
  await openCheck(page, true)
  await loadingGone(page)
  expect(await idbCount(page)).toBe(3)
  await page.locator('[data-check="adult"]').click()
  await page.getByRole('button', { name: /Bu tekshiruv ma.lumotlarini/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^O.chirish/ }).click()
  await expect(page.getByText(/Hali natija yo/)).toBeVisible()
  await expect.poll(() => idbCount(page)).toBe(2)
})

test('works in Russian', async ({ page, baseURL }) => {
  await start(page, baseURL!, { kind: 'child', rows: demoCheckRows('p-test'), lang: 'ru' })
  await openCheck(page, true)
  await loadingGone(page)
  await expect(page.getByText('Это не медицинский диагноз.').first()).toBeVisible()
  await page.locator('[data-check="child"]').click()
  await expect(page.getByText('Наблюдаем').first()).toBeVisible()
  await expect(page.getByText('Нужно внимание').first()).toBeVisible()
  await expect(page.getByText('Хорошо').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /План на сегодня: 15 мин/ })).toBeVisible()
})

test('works in Uzbek Cyrillic', async ({ page, baseURL }) => {
  await start(page, baseURL!, { kind: 'child', rows: demoCheckRows('p-test'), lang: 'uzc' })
  await openCheck(page, true)
  await loadingGone(page)
  await expect(page.getByText('Бу тиббий ташхис эмас.').first()).toBeVisible()
  await page.locator('[data-check="child"]').click()
  await expect(page.getByText('Кузатамиз').first()).toBeVisible()
  await expect(page.getByText('Яхши').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Бугунги режа: 15 дақ/ })).toBeVisible()
})

test.describe('no horizontal overflow on a small phone and with 200% text', () => {
  for (const vp of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    for (const big of [false, true]) {
      test(`${vp.width}px${big ? ' at 200%' : ''}`, async ({ page, baseURL }) => {
        test.setTimeout(150_000)
        await page.setViewportSize(vp)
        await start(page, baseURL!, { kind: 'child', rows: demoCheckRows('p-test') })
        await page.evaluate(() => { location.hash = '#/parent' })
        await passGate(page)
        // 200% text is applied once the adult gate is passed (the gate itself is not part of this feature)
        if (big) await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
        const wide = () =>
          page.evaluate(() => {
            const over = document.documentElement.scrollWidth - window.innerWidth
            const offenders: string[] = []
            for (const el of document.querySelectorAll('main *')) {
              const r = el.getBoundingClientRect()
              if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !el.closest('[aria-hidden="true"], .visually-hidden')) offenders.push(`${el.tagName}.${String(el.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`)
            }
            return { over, offenders: offenders.slice(0, 5) }
          })
        const check = async (label: string) => {
          if (big) await page.evaluate(() => window.dispatchEvent(new Event('resize')))
          await page.waitForTimeout(250)
          const w = await wide()
          expect(w.over, `${label}: page scrolls sideways ${w.over}px; ${w.offenders.join('; ')}`).toBeLessThanOrEqual(1)
          expect(w.offenders, `${label}: ${w.offenders.join('; ')}`).toEqual([])
        }
        for (const route of ['/parent/check', '/parent/check/child', '/parent/check/asd', '/parent/check/adult', '/parent/check/child/report']) {
          await page.evaluate((h) => { location.hash = h }, `#${route}`)
          await expect(page.locator('h1').first()).toBeVisible()
          await loadingGone(page)
          await check(route)
        }
        await page.evaluate(() => { location.hash = '#/parent/check/child/run' })
        await expect(page.locator('[data-age]').first()).toBeVisible()
        await check('age')
        await page.locator('[data-age="3-4"]').click()
        await expect(page.locator('[data-concern]').first()).toBeVisible()
        await check('concerns')
        await page.locator('[data-concern="unsure"]').click()
        await page.getByRole('button', { name: /^Keyingi/ }).click()
        await expect(page.getByTestId('question')).toBeVisible()
        await check('question')
        await answerAll(page, 5, (i) => (i === 3 ? 0 : 2))
        await expect(page.getByRole('heading', { name: /Keling, yaqinroq qaraymiz/ })).toBeVisible()
        await check('quick result')
        await page.getByRole('button', { name: /^Batafsil baholash/ }).click()
        await expect(page.getByTestId('question')).toBeVisible()
        await check('detail question')
      })
    }
  }
})
