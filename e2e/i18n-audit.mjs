// Language audit: walks every route and the meaningful states of the app in each language/script, dumps everything a
// person (or a screen reader) can read — visible text, aria-labels, titles, placeholders, alt text, document.title —
// and flags text that is in the wrong language or script, raw keys, {vars}, undefined/NaN, empty aria-labels, English.
//
// Usage (from the repo root, dev server running):  node e2e/i18n-audit.mjs http://localhost:5262/
// Env:  LANGS=uz,uzc,ru,uz2026   KINDS=child,adult   CRAWL=0 (skip the click crawl)   ONLY=/talk,/games   DUMP=file.json
//       HEADED=1   VERBOSE=1 (print where every finding was seen)
// Exit code 1 when anything is flagged. The goal is ZERO findings.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { demoRows, NAMES, seedApp } from './lib/seed.mjs'

const base = (process.argv[2] ?? 'http://localhost:5262/').replace(/#.*$/, '')
const LANGS = (process.env.LANGS ?? 'uz,uzc,ru,uz2026').split(',').filter(Boolean)
const KINDS = (process.env.KINDS ?? 'child,adult').split(',').filter(Boolean)
const CRAWL = process.env.CRAWL !== '0'
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)
const MAX_CLICKS = Number(process.env.MAX_CLICKS ?? 28)

// ---------------------------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------------------------

/** Latin words that are allowed on any screen (brand names, file formats, protocols). Compared case-insensitively. */
const LATIN_OK = new Set(
  ['gapimiz', 'musicha', 'pin', 'aac', 'pdf', 'github', 'json', 'webp', 'jpeg', 'png', 'html', 'url', 'indexeddb', 'wi-fi', 'wifi', 'qr', 'tts', 'ok', 'id', 'ai', 'pwa', 'unicode', 'mp3', 'ogg', 'zip', 'csv', 'gb', 'mb', 'kb', 'a4', 'a5',
    // keys as printed on a keyboard, and proper names of third-party works in the licence list
    'usb', 'tasks', 'vision', 'sil', 'open', 'font', 'license', 'licence', 'apache', 'workbox', 'zustand', 'motion', 'router', 'shakhzodmir', 'isc', 'alt', 'enter', 'shift', 'ctrl', 'tab', 'esc', 'space', 'ncaep', 'asha', 'mit', 'microsoft', 'corporation', 'fluent', 'emoji', 'azure', 'neural', 'nunito', 'onest', 'mediapipe', 'react', 'vite', 'dexie', 'lucide']
    .map((s) => s.toLowerCase()),
)
/** Exact strings that are legitimately in another language: language names shown in their own script. */
const PHRASE_OK = new Set(['Oʻzbekcha', 'O‘zbekcha', 'Oʻzbekcha (lotin)', 'O‘zbekcha (lotin)', 'lotin', 'Ўзбекча', 'Ўзбекча (кирилл)', 'кирилл', 'Русский'])
const cyr = /[Ѐ-ӿ]/
const lat = /[A-Za-zÀ-žʻʼ‘’]/
// Letters used by Uzbek Cyrillic but not by Russian, and the other way round (ё э ъ are shared).
const UZ_ONLY_CYR = /[ўқғҳЎҚҒҲ]/
const RU_ONLY_CYR = /[ыщЫЩ]/

const ENGLISH = new Set(
  `the and of to in on for with from your you our is are was be this that these those it its not no yes loading error errors settings setting back close save cancel delete edit add done next skip start stop play pause reset retry try again continue open view show hide more less all none off on enable disable enabled disabled language english home help about name profile profiles data export import backup restore print download upload file files image images photo photos sound sounds voice volume speed rate size color colour theme dark light mode level levels word words card cards game games story stories timer day week month year today tomorrow yesterday hello welcome please thank thanks sorry ok cancel confirm warning info failed success invalid unknown empty select choose search filter sort title description text label button click tap press hold drag drop swipe scroll page pages screen board mouse keyboard touch switch scan scanning delay hover item items list menu option options value values default custom auto manual normal calm festive high low medium small large big full app application offline online update version privacy terms licence license free paid new old true false null undefined`.split(
    /\s+/,
  ),
)
// Words that exist in both English and Uzbek/Russian transliteration contexts and must not be flagged on their own.
const ENGLISH_AMBIGUOUS = new Set(['normal', 'on', 'off', 'no', 'in', 'to', 'it', 'all', 'a', 'is', 'be', 'do', 'at', 'an', 'as', 'by', 'or', 'so', 'if', 'me', 'we', 'he', 'my', 'up', 'us', 'am'])

const RU_STOP = new Set('и не на что это для или при после чтобы если вы вас ваш ваша ваши мы мне мой моя мои с со из от до по за у к о об же бы ли то уже ещё еще только можно нужно будет был была были есть нет да'.split(/\s+/))
// Uzbek (Cyrillic or Latin) function words that never occur in Russian text.
const UZ_STOP_CYR = new Set('ва учун билан ёки ҳам керак бўлади қилинг босинг танланг эмас лекин аммо'.split(/\s+/))
const UZ_STOP_LAT = new Set(
  'va uchun bilan yoki ham kerak boʻladi qiling bosing tanlang emas lekin ammo yana bu shu oʻz ota-ona bola bolangiz sozlamalar oʻyinlar tugma'.split(/\s+/),
)
// Russian function words that never occur in Uzbek Latin text (they would be Cyrillic there anyway; kept for the report).
const RAW_KEY = /\b[a-z]+(?:[A-Z][a-z0-9]+){1,}\b|\b[a-z]{1,3}\.[a-z][a-z0-9_.]*\b/
const BAD_LITERALS = /\{[^}]*\}|\bundefined\b|\bNaN\b|\[object |\bnull\b|\bInfinity\b|%[sd]\b|\$\{/

function tokens(text) {
  return text.match(/[\p{L}\p{M}ʻʼ‘’'`´]+/gu)?.filter((t) => /\p{L}/u.test(t)) ?? []
}

/** Returns [{kind, detail}] for one piece of readable text. `names` are user-typed names (exempt). */
function judge(text, lang, names) {
  const out = []
  const t = text.replace(/­/g, '').replace(/\s+/g, ' ').trim()
  if (!t || PHRASE_OK.has(t)) return out
  let work = t
  for (const p of PHRASE_OK) work = work.split(p).join(' ')
  // machine strings: backup file names, voice ids (uz-UZ-MadinaNeural), key combos (Alt+B), paper sizes (A4), site paths
  work = work.replace(/\S+\.gapimiz\b/g, ' ').replace(/\b[a-z]{2}-[A-Z]{2}-\w+/g, ' ').replace(/\b(?:Alt|Ctrl|Shift)\+\w\b/g, ' ').replace(/\bA[3-6]\b/g, ' ').replace(/\b[\w.]+\.(?:com|org|io|uz)\/\S*/g, ' ')
  for (const n of names) work = work.split(n).join(' ')
  if (BAD_LITERALS.test(work)) out.push({ kind: 'raw-literal', detail: work.match(BAD_LITERALS)[0] })
  if (RAW_KEY.test(work.replace(/[Ёё]/g, 'е'))) {
    const m = work.match(RAW_KEY)[0]
    if (!LATIN_OK.has(m.toLowerCase())) out.push({ kind: 'raw-key', detail: m })
  }
  for (const w of tokens(work)) {
    const lw = w.toLowerCase().replace(/^[-'`´]+|[-'`´]+$/g, '')
    if (lw.length < 1) continue
    if ([...lw].length === 1) continue // keycaps and letter tiles
    const hasCyr = cyr.test(w)
    const hasLat = /[A-Za-zÀ-žʻʼ]/.test(w)
    if (hasCyr && hasLat && !LATIN_OK.has(lw)) out.push({ kind: 'mixed-script-word', detail: w })
    if (lang === 'uz' || lang === 'uz2026') {
      if (hasCyr) out.push({ kind: RU_ONLY_CYR.test(w) || RU_STOP.has(lw) ? 'russian-on-uz' : 'cyrillic-in-latin', detail: w })
      else if (!LATIN_OK.has(lw)) {
        if (ENGLISH.has(lw) && !ENGLISH_AMBIGUOUS.has(lw) && lw.length > 2) out.push({ kind: 'english', detail: w })
        if (lw.length > 1 && /w/.test(lw)) out.push({ kind: 'english', detail: w })
        if (/[a-z]['`´]/i.test(w) && /[a-z]/i.test(w)) out.push({ kind: 'ascii-apostrophe', detail: w })
        if (lang === 'uz2026' && (/(?:sh|ch)/i.test(w) || /[oOgG][ʻ‘']/.test(w))) out.push({ kind: 'mixed-2026-form', detail: w })
        if (lang === 'uz' && w.length > 1 && /[ŞÇÖĞşçöğ]/.test(w)) out.push({ kind: 'script-2026-in-1995', detail: w })
      }
    } else if (lang === 'uzc') {
      if (hasLat && !hasCyr && !LATIN_OK.has(lw) && lw.replace(/[^a-z]/gi, '').length >= 2) out.push({ kind: 'latin-in-cyrillic', detail: w })
      if (RU_ONLY_CYR.test(w) || (RU_STOP.has(lw) && !UZ_STOP_CYR.has(lw) && lw.length > 2)) out.push({ kind: 'russian-on-uzc', detail: w })
    } else if (lang === 'ru') {
      if (hasLat && !hasCyr && !LATIN_OK.has(lw) && lw.replace(/[^a-z]/gi, '').length >= 2) out.push({ kind: UZ_STOP_LAT.has(lw) || /[ʻʼ‘’]|(?:sh|ch|ng)/i.test(w) ? 'uzbek-in-ru' : 'latin-in-ru', detail: w })
      else if (hasLat && !hasCyr && !LATIN_OK.has(lw) && lw.length === 1 && /[A-Za-z]/.test(lw) && !/^\d/.test(w)) out.push({ kind: 'latin-in-ru', detail: w })
      if (UZ_ONLY_CYR.test(w) || UZ_STOP_CYR.has(lw)) out.push({ kind: 'uzbek-in-ru', detail: w })
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------------------------------
// In-page collection
// ---------------------------------------------------------------------------------------------------------------

const collect = () => {
  const items = []
  const seen = new Set()
  const pageLang = document.documentElement.lang
  // Text explicitly marked as another language (WCAG 3.1.2 `lang` attribute) is not a mix-up: it is labelled content,
  // e.g. the Uzbek and Russian forms of a card side by side in the card manager.
  const foreign = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const l = p.getAttribute && p.getAttribute('lang')
      if (l) return l.toLowerCase() !== pageLang.toLowerCase()
    }
    return false
  }
  const push = (src, text, el) => {
    const t = (text ?? '').replace(/\s+/g, ' ').trim()
    if (!t) return
    if (el && foreign(el) && !/^(EMPTY|UNNAMED)/.test(src)) return
    const tag = el ? el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') : ''
    const key = src + '|' + t + '|' + tag
    if (seen.has(key)) return
    seen.add(key)
    items.push({ src, text: t, tag })
  }
  const visible = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
    }
    return true
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const el = node.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue
    if (el.tagName === 'OPTION') {
      push('text', node.textContent, el)
      continue
    }
    if (!visible(el)) continue
    push('text', node.textContent, el)
  }
  const unnamed = []
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue
    const hiddenSub = el.closest('[aria-hidden="true"]')
    const vis = visible(el)
    const al = el.getAttribute('aria-label')
    if (al !== null) {
      if (!al.trim()) push('EMPTY-aria-label', '(empty)', el)
      else if (vis || el.closest('[hidden]')) push('aria-label', al, el)
    }
    const title = el.getAttribute('title')
    if (title && el.tagName !== 'TITLE' && !(el instanceof SVGElement && el.tagName !== 'svg')) push('title', title, el)
    const ph = el.getAttribute('placeholder')
    if (ph) push('placeholder', ph, el)
    const alt = el.getAttribute('alt')
    if (alt) push('alt', alt, el)
    for (const attr of ['aria-description', 'aria-roledescription', 'aria-valuetext', 'aria-placeholder']) {
      const v = el.getAttribute(attr)
      if (v) push(attr, v, el)
    }
    if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && el.value) push('value', el.value, el)
    // Interactive elements with no accessible name at all.
    if (vis && !hiddenSub && /^(BUTTON|A|SELECT|TEXTAREA)$/.test(el.tagName) || (vis && !hiddenSub && el instanceof HTMLInputElement && el.type !== 'hidden')) {
      const labelledby = el.getAttribute('aria-labelledby')
      const byLabel = el.labels && el.labels.length ? Array.from(el.labels).map((l) => l.textContent).join('') : ''
      const name = (al ?? '') + (title ?? '') + (el.textContent ?? '') + byLabel + (labelledby ? 'x' : '') + (el.getAttribute('alt') ?? '')
      const imgAlt = Array.from(el.querySelectorAll('img[alt]')).map((i) => i.getAttribute('alt')).join('')
      if (!name.trim() && !imgAlt.trim()) unnamed.push(el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''))
    }
  }
  for (const u of unnamed) push('UNNAMED-control', u, null)
  push('doc-title', document.title, null)
  push('html-lang', document.documentElement.lang || '(none)', null)
  return { items, hash: location.hash }
}

// ---------------------------------------------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------------------------------------------

/** finding key → {kind, detail, text, src, where:[...], langs:Set} */
const findings = new Map()
let snapshots = 0
let textsSeen = 0

function expectedHtmlLang(lang) {
  return lang === 'ru' ? 'ru' : lang === 'uzc' ? 'uz-Cyrl' : 'uz-Latn'
}

function record(ctx, where, data) {
  snapshots++
  const names = [NAMES.uz.child, NAMES.uz.adult, NAMES.uzc.child, NAMES.uzc.adult, NAMES.ru.child, NAMES.ru.adult, 'Madina Karimova', 'Test Card', 'Test Karta']
  for (const it of data.items) {
    textsSeen++
    if (it.src === 'EMPTY-aria-label' || it.src === 'UNNAMED-control') {
      add(ctx, where, it, it.src, it.text)
      continue
    }
    if (it.src === 'html-lang') {
      if (it.text !== expectedHtmlLang(ctx.lang === 'uz2026' ? 'uz' : ctx.lang)) add(ctx, where, it, 'html-lang', `${it.text} (want ${expectedHtmlLang(ctx.lang === 'uz2026' ? 'uz' : ctx.lang)})`)
      continue
    }
    for (const f of judge(it.text, ctx.lang, names)) add(ctx, where, it, f.kind, f.detail)
  }
}

function add(ctx, where, it, kind, detail) {
  const key = `${kind}|${detail}|${it.text.slice(0, 80)}|${it.src}`
  let f = findings.get(key)
  if (!f) {
    f = { kind, detail, text: it.text.slice(0, 120), src: it.src, tag: it.tag, where: [], langs: new Set() }
    findings.set(key, f)
  }
  f.langs.add(ctx.lang)
  if (f.where.length < 4) f.where.push(`${ctx.lang}/${ctx.kind} ${where}`)
}

async function snap(page, ctx, where) {
  const want = expectedHtmlLang(ctx.lang === 'uz2026' ? 'uz' : ctx.lang)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // <html lang> is set by an effect right after the first render: wait for it instead of racing it.
      if (ctx.kind !== 'onboarding' || true) await page.waitForFunction((w) => document.documentElement.lang === w, want, { timeout: 1500 }).catch(() => undefined)
      const data = await page.evaluate(collect)
      record(ctx, where, data)
      return
    } catch (e) {
      // a click that navigates / reloads destroys the context: look again once the page has settled
      if (attempt === 2 || !/context was destroyed|Target closed|navigation/i.test(String(e))) {
        add(ctx, where, { text: String(e).slice(0, 80), src: 'audit', tag: '' }, 'audit-error', where)
        return
      }
      await page.waitForTimeout(600)
    }
  }
}

/** The crawl presses everything, including the language and script switches. Those clicks change the state of the whole
 *  run (and are audited by the run of the other language), so after one the device state is put back and nothing is recorded. */
function wantedDevice(ctx) {
  const uiLang = ctx.lang === 'uz2026' ? 'uz' : ctx.lang
  const script = ctx.lang === 'uz2026' ? 'latn2026' : uiLang === 'uzc' ? 'cyrl' : 'latn'
  return [uiLang, script]
}
/** Reads / repairs the profile row: the speech-language override (Settings) must not leak from one probe into the next. */
const profileSpeech = (page, want, repair) =>
  page.evaluate(
    ([want, repair]) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(null), 3000)
        const r = indexedDB.open('gapimiz')
        r.onerror = () => resolve(null)
        r.onblocked = () => resolve(null)
        r.onsuccess = () => {
          const db = r.result
          if (!db.objectStoreNames.contains('profiles')) {
            db.close()
            return resolve(null)
          }
          const tx = db.transaction('profiles', 'readwrite')
          const st = tx.objectStore('profiles')
          const g = st.get('p-test')
          g.onsuccess = () => {
            const row = g.result
            if (!row) return resolve(null)
            const drift = row.speechLangFollowsUi !== true || row.speechLang !== want
            if (drift && repair) st.put({ ...row, speechLangFollowsUi: true, speechLang: want })
            tx.oncomplete = () => {
              db.close()
              resolve(drift)
            }
          }
        }
      }),
    [want, repair],
  )
async function deviceDrifted(page, ctx) {
  const dev = await page
    .evaluate(([l, sc]) => {
      try {
        const st = JSON.parse(localStorage.getItem('gapimiz.device')).state
        return st.uiLang !== l || st.uzScript !== sc
      } catch {
        return false
      }
    }, wantedDevice(ctx))
    .catch(() => false)
  if (dev) return true
  // read-only look at the profile (want = null: no repair)
  return (await profileSpeech(page, wantedDevice(ctx)[0] === 'ru' ? 'ru' : 'uz', false).catch(() => null)) === true
}
async function restoreDevice(page, ctx) {
  await page
    .evaluate(([l, sc]) => {
      const j = JSON.parse(localStorage.getItem('gapimiz.device'))
      j.state.uiLang = l
      j.state.uzScript = sc
      localStorage.setItem('gapimiz.device', JSON.stringify(j))
    }, wantedDevice(ctx))
    .catch(() => undefined)
  await profileSpeech(page, wantedDevice(ctx)[0] === 'ru' ? 'ru' : 'uz', true).catch(() => undefined)
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined)
  await page.waitForTimeout(500)
}
/** Records the state after a click, unless the click switched the language/script (then restores instead). */
async function snapAfterClick(page, ctx, where) {
  if (await deviceDrifted(page, ctx)) return restoreDevice(page, ctx)
  await snap(page, ctx, where)
}

async function go(page, route) {
  if (page.url().startsWith(base)) {
    // Same document: a hash change (page.goto would wait for a load that never comes).
    await page.evaluate((r) => {
      if (location.hash === `#${r}`) location.hash = '#/__x'
      location.hash = `#${r}`
    }, route)
  } else await page.goto(`${base}#${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1, [role=dialog], main', { timeout: 8000 }).catch(() => undefined)
  await page.waitForTimeout(160)
}

const CLICKABLE = 'main button:not([disabled]), main [role=button]:not([aria-disabled=true]), main [role=tab], main a[href], header button:not([disabled]), [role=dialog] button:not([disabled]), nav button:not([disabled]), main summary, main select, [role=switch], main [role=radio], main input[type=checkbox], main input[type=range]'

async function crawl(page, ctx, route) {
  for (let i = 0; i < MAX_CLICKS; i++) {
    let stop = false
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stop = await crawlStep(page, ctx, route, i)
        break
      } catch (e) {
        // a click that reloads or navigates the page destroys the evaluation context: take the step again
        if (attempt === 2 || !/context was destroyed|navigation|Target (page|closed)/i.test(String(e))) throw e
        await page.waitForTimeout(700)
      }
    }
    if (stop) return
  }
}

async function crawlStep(page, ctx, route, i) {
  {
    await go(page, route)
    const info = await page.evaluate(
      ([sel, i]) => {
        const els = Array.from(document.querySelectorAll(sel)).filter((e) => {
          const r = e.getBoundingClientRect()
          const cs = getComputedStyle(e)
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[aria-hidden="true"]')
        })
        const el = els[i]
        if (!el) return null
        const label = el.getAttribute('aria-label') || (el.textContent ?? '').trim().slice(0, 40) || el.tagName
        return { label, total: els.length }
      },
      [CLICKABLE, i],
    )
    if (!info || i >= info.total) return true
    const label = info.label
    try {
      await page.evaluate(
        ([sel, i]) => {
          const els = Array.from(document.querySelectorAll(sel)).filter((e) => {
            const r = e.getBoundingClientRect()
            const cs = getComputedStyle(e)
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[aria-hidden="true"]')
          })
          const el = els[i]
          el.scrollIntoView({ block: 'center' })
          if (el.tagName === 'SELECT') return
          el.click()
        },
        [CLICKABLE, i],
      )
    } catch {
      return false
    }
    await page.waitForTimeout(140)
    await snapAfterClick(page, ctx, `${route} > click "${label}"`)
    // Second level: if a dialog opened, click its non-destructive buttons once each.
    const dialogBtns = await page.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] button')).length)
    if (dialogBtns > 0) await page.keyboard.press('Escape')
    return false
  }
}

// Extra, hand-written states -------------------------------------------------------------------------------------

async function gateStates(browser, lang, kind) {
  const ctx = { lang, kind }
  const { context, page } = await fresh(browser, lang, kind, { device: { pinHash: null } })
  await go(page, '/parent')
  await snap(page, ctx, '/parent gate (hold)')
  // Hold the gate button for 1.7 s with the mouse, then we are inside the adult area through the real gate.
  const btn = page.locator('[role=dialog] button[aria-label]').first()
  const box = await btn.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await snap(page, ctx, '/parent gate (holding)')
    await page.waitForTimeout(1750)
    await page.mouse.up()
    await page.waitForTimeout(300)
    await snap(page, ctx, '/parent after gate')
  }
  // PIN stage: seed a PIN hash computed by the app itself.
  const hash = await page.evaluate(async (b) => (await import(`${b}src/ui/pin.ts`)).hashPin('1234'), base).catch(() => null)
  if (hash) {
    await page.evaluate(([h]) => {
      const s = JSON.parse(localStorage.getItem('gapimiz.device'))
      s.state.parentPinHash = h
      localStorage.setItem('gapimiz.device', JSON.stringify(s))
    }, [hash])
    await page.reload({ waitUntil: 'domcontentloaded' })
    await go(page, '/parent')
    const b2 = await page.locator('[role=dialog] button[aria-label]').first().boundingBox()
    if (b2) {
      await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(1750)
      await page.mouse.up()
      await page.waitForTimeout(300)
      await snap(page, ctx, '/parent gate (pin stage)')
      await page.locator('[role=dialog] input').first().fill('9999')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      await snap(page, ctx, '/parent gate (wrong pin)')
    }
  }
  await context.close()
}

async function errorStates(browser, lang, kind) {
  const ctx = { lang, kind }
  const { context, page } = await fresh(browser, lang, kind)
  await page.route(/\/src\/features\/timer\/index\.tsx|assets\/timer-/, (r) => r.abort())
  await page.evaluate(() => sessionStorage.setItem('gapimiz.chunkReloads', '9')).catch(() => undefined)
  await go(page, '/timer')
  await page.waitForTimeout(800)
  await snap(page, ctx, 'error boundary (chunk failure)')
  await page.unroute(/\/src\/features\/timer\/index\.tsx|assets\/timer-/)
  await go(page, '/nonexistent-page')
  await snap(page, ctx, '404')
  // The unspoken overlay: ask the app to speak something that has neither a clip nor a voice.
  await go(page, '/')
  await page.evaluate(async (b) => {
    const { speak } = await import(`${b}src/audio/speech.ts`)
    void speak({ key: 'zz.audit', text: { uz: 'Salom dunyo', ru: 'Привет, мир' } })
  }, base).catch(() => undefined)
  await page.waitForTimeout(900)
  await snap(page, ctx, 'unspoken overlay')
  await context.close()
}

async function onboardingStates(browser, lang) {
  const ctx = { lang, kind: 'onboarding' }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await context.newPage()
  const uiLang = lang === 'uz2026' ? 'uz' : lang
  const script = lang === 'uz2026' ? 'latn2026' : uiLang === 'uzc' ? 'cyrl' : 'latn'
  await page.addInitScript(
    ([uiLang, script]) => {
      if (!localStorage.getItem('gapimiz.device')) localStorage.setItem('gapimiz.device', JSON.stringify({ state: { uiLang, uzScript: script, onboarded: false, activeProfileId: null, boardMode: false, boardHintDismissed: true, boardCalibration: null, parentPinHash: null }, version: 1 }))
    },
    [uiLang, script],
  )
  await page.goto(`${base}#/onboarding`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
  await snap(page, ctx, 'onboarding: language')
  await page.goto(`${base}#/onboarding?step=who`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(400)
  await snap(page, ctx, 'onboarding: who')
  await page.goto(`${base}#/onboarding?step=name`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(400)
  await snap(page, ctx, 'onboarding: name')
  const next = page.locator('main button:not([disabled])').last()
  await page.locator('main input').first().fill('Aziz')
  await snap(page, ctx, 'onboarding: name filled')
  await next.click().catch(() => undefined)
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(350)
    await snap(page, ctx, `onboarding: info ${i + 1}`)
    await page.locator('main button:not([disabled])').last().click().catch(() => undefined)
  }
  await context.close()
}

async function fresh(browser, lang, kind, opts = {}) {
  const uiLang = lang === 'uz2026' ? 'uz' : lang
  const script = lang === 'uz2026' ? 'latn2026' : undefined
  const vp = opts.viewport ?? { width: 1280, height: 900 }
  const context = await browser.newContext({ viewport: vp, hasTouch: false })
  await context.grantPermissions(['camera', 'microphone']).catch(() => undefined)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await seedApp(page, base, {
    lang: uiLang,
    kind,
    name: NAMES[uiLang][kind],
    device: { script, ...(opts.device ?? {}) },
    profile: { ...(opts.profile ?? {}) },
    rows: demoRows('p-test'),
  })
  page.errors = errors
  return { context, page }
}

// Dynamic route inventory (read from the app's own content, via the dev server) ------------------------------------

async function inventory(page) {
  return page.evaluate(async (b) => {
    const out = { games: [], stories: [], feelings: [], mirror: [] }
    try {
      out.games = (await import(`${b}src/features/games/registry.ts`)).GAMES.map((g) => g.id)
    } catch {
      out.games = ['animals', 'find', 'memory', 'syllables']
    }
    try {
      out.stories = (await import(`${b}src/content/stories.ts`)).STORIES.map((s) => s.id)
    } catch {
      out.stories = []
    }
    try {
      out.feelings = (await import(`${b}src/content/feelings.ts`)).FEELINGS.map((s) => s.id)
    } catch {
      out.feelings = []
    }
    try {
      out.mirror = (await import(`${b}src/content/exercises.ts`)).ARTICULATION.map((s) => s.id)
    } catch {
      out.mirror = []
    }
    return out
  }, base)
}

const BASE_ROUTES = [
  '/', '/talk', '/talk?mode=keyboard', '/talk?mode=phrases', '/talk?mode=pain', '/talk?mode=topics', '/day', '/timer', '/tokens', '/calm', '/feelings', '/stories', '/games',
  '/games/stickers', '/exercises', '/exercises/blow', '/exercises/voice', '/exercises/mirror', '/board-setup',
  '/parent', '/parent/progress', '/parent/tips', '/parent/cards', '/parent/profiles', '/parent/settings', '/parent/data', '/parent/print', '/parent/about',
]
const qa = (r) => (r.startsWith('/parent') ? `${r}?qa` : r)

async function walkProfile(browser, lang, kind) {
  const ctx = { lang, kind }
  const { context, page } = await fresh(browser, lang, kind)
  const inv = await inventory(page)
  const routes = [
    ...BASE_ROUTES,
    ...inv.games.map((g) => `/games/${g}`),
    ...inv.stories.map((s) => `/stories/${s}`),
    ...inv.feelings.map((f) => `/feelings/${f}`),
    ...inv.mirror.map((m) => `/exercises/mirror/${m}`),
  ].filter((r) => !ONLY.length || ONLY.some((o) => r === o || r.startsWith(o + '/') || r.startsWith(o + '?')))
  for (const r of routes) {
    await go(page, qa(r))
    await snap(page, ctx, r)
    if (CRAWL) await crawl(page, ctx, qa(r))
    if (page.isClosed()) break
  }
  // Story pages: step through every page of every story.
  for (const s of inv.stories) {
    if (ONLY.length && !ONLY.some((o) => '/stories'.startsWith(o) || o.startsWith('/stories'))) break
    await go(page, `/stories/${s}`)
    for (let i = 0; i < 12; i++) {
      const next = page.locator('main button:not([disabled])', { hasText: /./ }).last()
      const before = await page.locator('main').innerText().catch(() => '')
      await next.click({ timeout: 800 }).catch(() => undefined)
      await page.waitForTimeout(260)
      await snap(page, ctx, `/stories/${s} page ${i + 2}`)
      if ((await page.locator('main').innerText().catch(() => '')) === before) break
    }
  }
  // Game rounds: click through a few rounds of every game.
  for (const g of inv.games) {
    if (ONLY.length && !ONLY.some((o) => '/games'.startsWith(o) || o.startsWith('/games'))) break
    await go(page, `/games/${g}`)
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const bs = Array.from(document.querySelectorAll('main button:not([disabled]), main [role=button]')).filter((b) => {
          const r = b.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        })
        const pick = bs.filter((b) => !/back|orqaga|назад/i.test(b.getAttribute('aria-label') ?? ''))
        const el = pick[Math.min(pick.length - 1, 1 + (Math.floor(Math.random() * 3) % Math.max(1, pick.length - 1)))] ?? pick[0]
        el?.click()
      })
      await page.waitForTimeout(500)
      await snap(page, ctx, `/games/${g} step ${i + 1}`)
    }
  }
  if (page.errors.length) add(ctx, 'page errors', { text: page.errors.join(' | ').slice(0, 100), src: 'console', tag: '' }, 'page-error', page.errors[0].slice(0, 80))
  await context.close()
}

async function boardStates(browser, lang, kind) {
  const ctx = { lang, kind }
  const { context, page } = await fresh(browser, lang, kind, {
    viewport: { width: 1920, height: 1080 },
    device: { boardMode: true, calibration: { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8', distanceM: 4, scale: 1.5, reach: 0.45 } },
  })
  for (const r of ['/', '/talk', '/games', '/board-setup']) {
    await go(page, r)
    await snap(page, ctx, `board mode ${r}`)
    if (CRAWL && r !== '/board-setup') await crawl(page, ctx, r)
  }
  await go(page, '/board-setup')
  for (let i = 0; i < 12; i++) {
    await go(page, '/board-setup')
    const labels = await page.locator('main button:not([disabled])').count()
    if (i >= labels) break
    await page.locator('main button:not([disabled])').nth(i).click({ timeout: 800 }).catch(() => undefined)
    await page.waitForTimeout(200)
    await snap(page, ctx, `board-setup click #${i}`)
  }
  await context.close()
}

async function parentStates(browser, lang, kind) {
  // Dialogs of the adult area: card editor, profile editor, backup/wipe confirms.
  const ctx = { lang, kind }
  const { context, page } = await fresh(browser, lang, kind)
  for (const r of ['/parent/cards', '/parent/profiles', '/parent/data', '/parent/settings', '/parent/print']) {
    await go(page, `${r}?qa`)
    await snap(page, ctx, `${r} (deep)`)
    // Open every button once, then every second-level dialog button once, with Escape in between.
    const n = await page.locator('main button:not([disabled])').count()
    for (let i = 0; i < Math.min(n, 40); i++) {
      await go(page, `${r}?qa`)
      const b = page.locator('main button:not([disabled])').nth(i)
      const label = (await b.getAttribute('aria-label').catch(() => null)) ?? (await b.innerText().catch(() => '')).slice(0, 30)
      await b.click({ timeout: 800 }).catch(() => undefined)
      await page.waitForTimeout(220)
      await snapAfterClick(page, ctx, `${r} > "${label}"`)
      const d = page.locator('[role=dialog] button:not([disabled])')
      const dn = await d.count()
      for (let j = 0; j < Math.min(dn, 6); j++) {
        const inner = page.locator('[role=dialog] button:not([disabled])').nth(j)
        const il = (await inner.getAttribute('aria-label').catch(() => null)) ?? (await inner.innerText().catch(() => '')).slice(0, 30)
        if (/close|yopish|закры|ёпиш/i.test(il)) continue
        // confirming these wipes the data of the run (the dialog itself is audited); everything else is pressed
        if (/^(Ha|Да|Ҳа),\s/.test(il)) continue
        await inner.click({ timeout: 600 }).catch(() => undefined)
        await page.waitForTimeout(220)
        await snapAfterClick(page, ctx, `${r} > "${label}" > "${il}"`)
        await go(page, `${r}?qa`)
        await page.locator('main button:not([disabled])').nth(i).click({ timeout: 800 }).catch(() => undefined)
        await page.waitForTimeout(200)
      }
      await page.keyboard.press('Escape')
    }
  }
  await context.close()
}

const browser = await chromium.launch({
  headless: process.env.HEADED !== '1',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const t0 = Date.now()
const jobs = []
for (const lang of LANGS) {
  for (const kind of KINDS) {
    for (const [name, fn] of [['walk', walkProfile], ['parent', parentStates], ['board', boardStates], ['gate+errors', async (b, l, k) => { await gateStates(b, l, k); await errorStates(b, l, k) }]]) {
      jobs.push(async () => {
        await fn(browser, lang, kind)
        process.stdout.write(`... done ${lang}/${kind} ${name}
`)
      })
    }
  }
  jobs.push(async () => {
    await onboardingStates(browser, lang)
    process.stdout.write(`... done ${lang}/onboarding
`)
  })
}
const CONC = Number(process.env.CONC ?? 6)
let next = 0
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]
      try {
        const limited = () => Promise.race([job(), new Promise((_, rej) => setTimeout(() => rej(new Error('job timeout (10 min)')), 600000))])
        try {
          await limited()
        } catch {
          await limited() // a navigation raced a snapshot: the whole job is simply run once more
        }
      } catch (e) {
        add({ lang: '-', kind: '-' }, 'runner', { text: String(e).slice(0, 100), src: 'audit', tag: '' }, 'audit-error', String(e).slice(0, 80))
      }
    }
  }),
)
await browser.close()

// ---------------------------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------------------------
const list = [...findings.values()]
const byKind = new Map()
for (const f of list) {
  if (!byKind.has(f.kind)) byKind.set(f.kind, [])
  byKind.get(f.kind).push(f)
}
console.log(`\nLanguage audit — ${LANGS.join(', ')} × ${KINDS.join(', ')} — ${snapshots} snapshots, ${textsSeen} strings, ${Math.round((Date.now() - t0) / 1000)} s`)
for (const [kind, items] of [...byKind.entries()].sort()) {
  console.log(`\n## ${kind} (${items.length})`)
  for (const f of items.slice(0, process.env.VERBOSE ? 9999 : 60)) {
    console.log(`  [${[...f.langs].join(',')}] ${f.src}: «${f.detail}»  in "${f.text}"   @ ${f.where[0]}${process.env.VERBOSE ? '  | ' + f.where.slice(1).join(' | ') : ''}`)
  }
  if (!process.env.VERBOSE && items.length > 60) console.log(`  … ${items.length - 60} more`)
}
if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(list.map((f) => ({ ...f, langs: [...f.langs] })), null, 1))
console.log(`\nFINDINGS: ${list.length}`)
process.exit(list.length ? 1 : 0)
