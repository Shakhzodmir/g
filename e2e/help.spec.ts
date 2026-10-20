// «Qayerga murojaat qilish» (the adult help page) and the family's contact book, through the REAL UI: the adult gate, the page,
// adding / editing / deleting an entry, a reload (the book is kept on the device), the printable phone sheet and the layout on a phone.
//
// Run (dev server on 5273):  E2E_BASE_URL=http://localhost:5273/ npx playwright test e2e/help.spec.ts
import { expect, test, type Page } from '@playwright/test'
import { demoRows, seedApp } from './lib/seed.mjs'

test.describe.configure({ mode: 'default' })

async function start(page: Page, baseURL: string, lang: 'uz' | 'uzc' | 'ru' = 'uz') {
  await seedApp(page, baseURL, { lang, kind: 'child', profile: {}, rows: demoRows('p-test') })
  await expect(page.locator('h1').first()).toBeVisible()
}

/** Goes to a screen of the adult area the way a person does: the gate, held for 1.5 s. */
async function openAdult(page: Page, hash: string) {
  await page.evaluate((h) => { location.hash = h }, hash)
  const hold = page.getByRole('dialog').getByRole('button', { name: /Kattalar uchun|Для взрослых|Катталар учун/ })
  if (!(await hold.isVisible().catch(() => false)) && !(await hold.waitFor({ state: 'visible', timeout: 2500 }).then(() => true, () => false))) return
  const box = (await hold.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1700)
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

const title = /Qayerga murojaat qilish|Куда обратиться|Қаерга мурожаат қилиш/

test('the help page: reached from the adult home, urgent block with the ambulance number, no invented numbers', async ({ page, baseURL, isMobile }) => {
  test.skip(isMobile, 'desktop project only: the adult gate needs a held mouse press')
  await start(page, baseURL!)
  await openAdult(page, '#/parent')
  await page.getByRole('button', { name: title }).click()
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  const urgent = page.getByTestId('help-urgent')
  await expect(urgent).toContainText('103')
  await expect(urgent.getByRole('link')).toHaveAttribute('href', 'tel:103')
  // the only telephone link on a fresh page is the ambulance
  const hrefs = await page.getByRole('link').evaluateAll((a) => a.map((x) => x.getAttribute('href')).filter((h) => h?.startsWith('tel:')))
  expect(hrefs).toEqual(['tel:103'])
})

test('contact book: add, call link, edit, reload keeps it, print sheet shows it, delete', async ({ page, baseURL, isMobile }) => {
  test.skip(isMobile, 'desktop project only: the adult gate needs a held mouse press')
  await start(page, baseURL!)
  await openAdult(page, '#/parent/help')
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect(page.getByTestId('book-empty')).toBeVisible()

  await page.getByRole('button', { name: /Yozuv qo.shish/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/Ismi yoki nomi/).fill('Dr. Karimova')
  await dialog.getByLabel(/^Telefon/).fill('90 123 45 67')
  await dialog.getByLabel(/Manzil yoki klinika/).fill('Toshkent, Chilonzor')
  await dialog.getByRole('button', { name: 'Saqlash' }).click()
  await expect(dialog).toHaveCount(0)
  const list = page.getByTestId('book-list')
  await expect(list).toContainText('Dr. Karimova')
  await expect(list.getByRole('link')).toHaveAttribute('href', 'tel:+998901234567')

  // an empty form is refused with a reason, nothing is added
  await page.getByRole('button', { name: /Yozuv qo.shish/ }).click()
  await dialog.getByRole('button', { name: 'Saqlash' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button', { name: /Bekor qilish/ }).click()
  await expect(list.getByRole('listitem')).toHaveCount(1)

  // edit
  await page.getByRole('button', { name: /^Tahrirlash: Dr\. Karimova/ }).click()
  await dialog.getByLabel(/Ismi yoki nomi/).fill('Dr. Rahimova')
  await dialog.getByRole('button', { name: 'Saqlash' }).click()
  await expect(list).toContainText('Dr. Rahimova')

  // reload: the book is kept on the device
  await page.reload()
  await openAdult(page, '#/parent/help')
  await expect(page.getByTestId('book-list')).toContainText('Dr. Rahimova')

  // the printable sheet lists it, with a QR code to this page
  await page.getByRole('button', { name: /Telefonlar varaqasini chop etish/ }).click()
  const sheet = page.getByRole('region', { name: 'Muhim telefonlar' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('table')).toContainText('Dr. Rahimova')
  await expect(sheet.getByRole('table')).toContainText('90 123 45 67')
  await expect(sheet.locator('[data-qr="/parent/help"] svg')).toBeVisible()

  // back to the book and delete (with a confirmation)
  await page.evaluate(() => { location.hash = '#/parent/help' })
  await page.getByRole('button', { name: /O.chirish: Dr\. Rahimova/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: /O.chirish$/ }).click()
  await expect(page.getByTestId('book-empty')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gapimiz.contacts') ?? '{"state":{"contacts":[]}}').state.contacts.length)).toBe(0)
})

test('"delete all data" also removes the contact book', async ({ page, baseURL, isMobile }) => {
  test.skip(isMobile, 'desktop project only: the adult gate needs a held mouse press')
  await start(page, baseURL!)
  await page.evaluate(() => localStorage.setItem('gapimiz.contacts', JSON.stringify({ state: { contacts: [{ id: 'c1', name: 'Dr. Karimova', role: 'logoped', phone: '103', place: '', note: '', createdAt: 1 }] }, version: 1 })))
  await openAdult(page, '#/parent/data')
  await page.getByRole('button', { name: /^Hammasini o.chirish$/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^Ha, hammasini o.chirish$/ }).click()
  // the app reloads itself after the wipe: poll until the new page answers
  await expect.poll(() => page.evaluate(() => localStorage.getItem('gapimiz.contacts')).catch(() => 'reloading'), { timeout: 15_000 }).toBeNull()
})

for (const lang of ['uz', 'uzc', 'ru'] as const) {
  test(`layout: no horizontal scroll, text and buttons inside the screen (${lang})`, async ({ page, baseURL }) => {
    await start(page, baseURL!, lang)
    await page.evaluate(() => localStorage.setItem('gapimiz.contacts', JSON.stringify({ state: { contacts: [{ id: 'c1', name: 'Dr. Muhammadjonova Gulnoza Abdullayevna'.padEnd(80, 'x'), role: 'centre', phone: '+998 71 123 45 67', place: 'Toshkent shahri, Chilonzor tumani, Bunyodkor koʻchasi 12-uy, 2-qavat'.padEnd(160, 'y'), note: 'z'.repeat(300), createdAt: 1 }] }, version: 1 })))
    await openAdult(page, '#/parent/help')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(500)
    const over = await page.evaluate(() => {
      const w = document.documentElement.clientWidth
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) }).map((e) => `${e.tagName}.${String(e.className).split(' ')[0]}`)
      return { scroll: document.documentElement.scrollWidth - w, wide: wide.slice(0, 5) }
    })
    expect(over.scroll, JSON.stringify(over)).toBeLessThanOrEqual(0)
    expect(over.wide, JSON.stringify(over)).toEqual([])
  })
}
