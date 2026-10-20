// Renders every printable sheet (Parents > Print) to PDF with Chromium's print engine, checks the layout in print mode and
// reads the QR codes back from the rasterised pages. Usage:
//   node e2e/printables-pdf.mjs [baseUrl] [outDir]          (dev server: ?qa unlocks the adult area)
//   E2E_QR=0 node e2e/printables-pdf.mjs ...                 skips the raster + QR decode stage
// Output: <outDir>/<job>.pdf and, when Python with PyMuPDF (`pip install pymupdf`) is available, <job>-p<N>.png per page.
// Checks: nothing sticks out of its sheet, body content never runs into the footer, the page count matches, and every QR
// code on the sheets decodes (jsQR) to the address printed in its accessible name. Exit code 1 on any failure.
import { chromium } from '@playwright/test'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { seedApp } from './lib/seed.mjs'

const base = (process.argv[2] ?? 'http://localhost:5273/').replace(/\/?$/, '/')
const out = resolve(process.argv[3] ?? 'test-results/printables')
const RASTER = process.env.E2E_QR !== '0'
mkdirSync(out, { recursive: true })

/** A contact book of `n` entries; `long` fills every field to its limit (the worst case for the layout). */
const bookOf = (n, long) =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    name: long ? `Dr. Muhammadjonova Gulnoza Abdullayevna ${i + 1}`.padEnd(80, 'x') : `Dr. Karimova ${i + 1}`,
    role: ['logoped', 'doctor', 'ent', 'neurologist', 'centre', 'school'][i % 6],
    phone: `90 123 45 ${String(10 + i).padStart(2, '0')}`,
    place: long ? `Toshkent sh., Chilonzor t., Bunyodkor ko'chasi ${i + 1}-uy, 2-qavat, 205-xona, mo'ljal: dorixona`.padEnd(160, 'y') : 'Toshkent, Chilonzor',
    note: long ? 'Seshanba va payshanba 10:00-13:00, oldindan yozilish kerak'.padEnd(300, 'z') : 'Seshanba 10:00',
    createdAt: i,
  }))

/** @type {Array<{ name: string; kind: string; lang?: string; sheetLang?: string; days?: string; start?: string; name_?: string; mono?: boolean; pages: number }>} */
const JOBS = [
  { name: 'cards', kind: 'Kartochkalar', pages: 0 },
  { name: 'diary-7', kind: 'Mashq kundaligi', days: '7 kun', pages: 1 },
  { name: 'diary-14-dates', kind: 'Mashq kundaligi', days: '14 kun', start: '2026-10-19', name_: 'Muhammadamin Abdurahmonov', pages: 1 },
  { name: 'diary-30', kind: 'Mashq kundaligi', days: '30 kun', start: '2026-11-25', pages: 2 },
  { name: 'diary-14-ru', kind: 'Mashq kundaligi', days: '14 kun', sheetLang: 'Русский', pages: 1 },
  { name: 'routine-uz', kind: 'Uyda 15 daqiqa', pages: 1 },
  { name: 'routine-ru', kind: 'Uyda 15 daqiqa', sheetLang: 'Русский', pages: 1 },
  { name: 'routine-uzc', kind: 'Uyda 15 daqiqa', sheetLang: 'Ўзбекча (кирилл)', pages: 1 },
  { name: 'artic-uz', kind: 'Artikulyatsion mashqlar', pages: 1 },
  { name: 'artic-ru-mono', kind: 'Artikulyatsion mashqlar', sheetLang: 'Русский', mono: true, pages: 1 },
  { name: 'artic-uzc', kind: 'Artikulyatsion mashqlar', sheetLang: 'Ўзбекча (кирилл)', pages: 1 },
  { name: 'contacts-6', kind: 'Telefonlar varaqasi', contacts: 6, pages: 1 },
  { name: 'contacts-empty-ru', kind: 'Telefonlar varaqasi', sheetLang: 'Русский', contacts: 0, pages: 1 },
  { name: 'contacts-6-uzc', kind: 'Telefonlar varaqasi', sheetLang: 'Ўзбекча (кирилл)', contacts: 6, pages: 1 },
  { name: 'contacts-11', kind: 'Telefonlar varaqasi', contacts: 11, pages: 1 },
  { name: 'contacts-30-long', kind: 'Telefonlar varaqasi', contacts: 30, long: true, pages: 3 },
]
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)

/** Layout probe run in print emulation: sheets are 190 x 276 mm; nothing may leave its sheet or run into the footer. */
const probe = () => {
  const problems = []
  const sheets = [...document.querySelectorAll('section[aria-label]')].filter((s) => s.querySelector('[data-qr]'))
  const mmW = (el) => (el.getBoundingClientRect().width / 96) * 25.4
  sheets.forEach((sheet, i) => {
    const sr = sheet.getBoundingClientRect()
    if (Math.abs(mmW(sheet) - 190) > 1) problems.push(`sheet ${i + 1} is ${mmW(sheet).toFixed(1)} mm wide, not 190`)
    const h = (sr.height / 96) * 25.4
    if (Math.abs(h - 276) > 1) problems.push(`sheet ${i + 1} is ${h.toFixed(1)} mm tall, not 276`)
    for (const el of sheet.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right > sr.right + 0.6 || r.left < sr.left - 0.6 || r.bottom > sr.bottom + 0.6 || r.top < sr.top - 0.6) {
        const tag = `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''}`
        problems.push(`sheet ${i + 1}: ${tag} sticks out (${Math.round(r.left - sr.left)}..${Math.round(r.right - sr.left)} x ${Math.round(r.top - sr.top)}..${Math.round(r.bottom - sr.top)} of ${Math.round(sr.width)} x ${Math.round(sr.height)} px)`)
      }
    }
    const foot = sheet.querySelector('footer')
    const body = sheet.querySelector('footer')?.previousElementSibling
    if (foot && body) {
      const fr = foot.getBoundingClientRect()
      for (const c of body.querySelectorAll('*')) {
        const r = c.getBoundingClientRect()
        if (r.height > 0 && r.width > 0 && r.bottom > fr.top + 0.6) problems.push(`sheet ${i + 1}: ${c.tagName.toLowerCase()} runs into the footer`)
      }
    }
    // text clipped by its own box
    for (const el of sheet.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (!el.hasAttribute('data-clamp') && (cs.overflow === 'hidden' || cs.overflowX === 'hidden') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) problems.push(`sheet ${i + 1}: clipped content in ${el.tagName.toLowerCase()}`)
    }
  })
  // every QR code with its box in mm, relative to its sheet (the sheet sits at the 10 mm page margin of its PDF page)
  const toMm = (px) => (px / 96) * 25.4
  const codes = []
  sheets.forEach((sheet, i) => {
    const sr = sheet.getBoundingClientRect()
    for (const svg of sheet.querySelectorAll('[data-qr] svg[aria-label]')) {
      const r = svg.getBoundingClientRect()
      codes.push({ sheet: i, x: toMm(r.left - sr.left), y: toMm(r.top - sr.top), w: toMm(r.width), h: toMm(r.height), url: (svg.getAttribute('aria-label') ?? '').split(/\s/).pop() })
    }
  })
  return { problems, sheets: sheets.length, codes }
}

const browser = await chromium.launch()
let failed = 0
const report = []
for (const job of JOBS) {
  if (ONLY.length && !ONLY.includes(job.name)) continue
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (job.contacts !== undefined) await page.addInitScript((j) => localStorage.setItem('gapimiz.contacts', j), JSON.stringify({ state: { contacts: bookOf(job.contacts, job.long) }, version: 1 }))
  await seedApp(page, base, { lang: 'uz', kind: 'child', name: 'Aziz' })
  await page.goto(`${base}#/parent/print?qa`, { waitUntil: 'load' })
  await page.waitForSelector('h1')
  await page.locator('label', { hasText: job.kind }).first().click()
  if (job.sheetLang) await page.locator('label', { hasText: job.sheetLang }).first().click()
  if (job.days) await page.locator('label', { hasText: job.days }).first().click()
  if (job.name_) await page.getByLabel('Ism (ixtiyoriy)').fill(job.name_)
  if (job.start) await page.getByLabel('Boshlanish sanasi (ixtiyoriy)').fill(job.start)
  if (job.mono) await page.getByRole('switch', { name: /Qora-oq/ }).click()
  await page.waitForSelector('[data-qr] svg', { state: 'attached', timeout: 10000 }).catch(() => errors.push('no QR code appeared'))
  await page.waitForTimeout(500) // images and the Ogizcha faces settle
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))))
  })
  await page.emulateMedia({ media: 'print' })
  const res = await page.evaluate(probe)
  const pdfPath = join(out, `${job.name}.pdf`)
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  writeFileSync(pdfPath, pdf)
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length
  const problems = [...res.problems]
  const want = job.pages || res.sheets // cards: as many pages as there are card sheets
  if (res.sheets !== want || res.sheets === 0) problems.push(`expected ${want} sheet(s) in the DOM, found ${res.sheets}`)
  if (pageCount !== want) problems.push(`PDF has ${pageCount} page(s), expected ${want}`)
  if (errors.length) problems.push(`page errors: ${errors.join('; ')}`)
  report.push({ job, pdfPath, codes: res.codes, problems })
  await ctx.close()
}
await browser.close()

// Raster + QR decode (PyMuPDF renders the PDFs exactly as written, independent of Chromium's screen rendering)
if (RASTER) {
  const py = `
import sys, glob, os
try:
    import fitz
except Exception:
    print('NOFITZ'); sys.exit(0)
dpi = 200
for f in sorted(glob.glob(os.path.join(sys.argv[1], '*.pdf'))):
    doc = fitz.open(f)
    for i, pg in enumerate(doc):
        pg.get_pixmap(dpi=dpi, alpha=False).save(f[:-4] + '-p%d.png' % (i + 1))
print('OK')
`
  let ok = false
  for (const exe of ['python', 'python3', 'py']) {
    try {
      const r = execFileSync(exe, ['-I', '-c', py, out], { encoding: 'utf8' }).trim()
      ok = r === 'OK'
      if (!ok) console.log('(PyMuPDF not installed: skipping the QR decode stage)')
      break
    } catch {
      /* try the next launcher */
    }
  }
  if (ok) {
    const DPI = 200
    const px = (mm) => Math.round((mm / 25.4) * DPI)
    for (const r of report) {
      const found = []
      const images = new Map()
      for (const c of r.codes) {
        if (!images.has(c.sheet)) images.set(c.sheet, await sharp(join(out, `${r.job.name}-p${c.sheet + 1}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }))
        const { data, info } = images.get(c.sheet)
        // the printed code plus 2 mm around it (a scanner sees the quiet zone, not the neighbouring text)
        const x0 = Math.max(0, px(10 + c.x - 2))
        const y0 = Math.max(0, px(10 + c.y - 2))
        const w = Math.min(info.width - x0, px(c.w + 4))
        const h = Math.min(info.height - y0, px(c.h + 4))
        const buf = new Uint8ClampedArray(w * h * 4)
        for (let row = 0; row < h; row++) buf.set(data.subarray(((y0 + row) * info.width + x0) * 4, ((y0 + row) * info.width + x0 + w) * 4), row * w * 4)
        const code = jsQR(buf, w, h)
        found.push(code?.data ?? null)
        if (code?.data !== c.url) r.problems.push(`QR code on sheet ${c.sheet + 1} (${c.w.toFixed(0)} mm) should read ${c.url}, read ${code?.data ?? 'nothing'}`)
        if (c.w < 21) r.problems.push(`QR code on sheet ${c.sheet + 1} is only ${c.w.toFixed(1)} mm wide (minimum 21 mm)`)
      }
      r.found = found
    }
  }
}

for (const r of report) {
  const state = r.problems.length ? 'FAIL' : 'ok  '
  console.log(`${state} ${r.job.name}  ${r.pdfPath}  QR: ${r.found ? r.found.filter(Boolean).length + ' decoded of ' + r.codes.length : r.codes.length + ' not decoded'}`)
  for (const p of r.problems) console.log(`       - ${p}`)
  if (r.problems.length) failed++
}
if (!existsSync(out)) process.exit(1)
process.exit(failed ? 1 : 0)
