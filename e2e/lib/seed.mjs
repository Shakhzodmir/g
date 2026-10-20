// Shared e2e helpers: seeds a device + a stored profile (child or adult) so a test starts "after onboarding".
// Works against the Vite dev server and against a production build (no src imports).

export const NAMES = {
  uz: { child: 'Aziz', adult: 'Madina' },
  uzc: { child: 'Азиз', adult: 'Мадина' },
  ru: { child: 'Азиз', adult: 'Мадина' },
}

export function deviceJson({ uiLang = 'uz', script, boardMode = false, calibration = null, activeProfileId = 'p-test', pinHash = null, hint = true } = {}) {
  const uzScript = script ?? (uiLang === 'uzc' ? 'cyrl' : 'latn')
  return JSON.stringify({
    state: { uiLang, uzScript, onboarded: true, activeProfileId, boardMode, boardHintDismissed: hint, boardCalibration: calibration, parentPinHash: pinHash },
    version: 1,
  })
}

/**
 * Prepares `page` (a fresh page of a fresh context): device state in localStorage (only when nothing is stored yet, so
 * changes made through the UI survive reloads), then a profile row (and optional extra rows) in IndexedDB.
 * Leaves the page loaded on `${base}#/`.
 */
export async function seedApp(page, base, opts = {}) {
  const { lang = 'uz', kind = 'child', name, profile = {}, rows = {}, device = {} } = opts
  const id = profile.id ?? 'p-test'
  await page.addInitScript(
    ([key, json]) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, json)
      } catch {
        /* ignore */
      }
    },
    ['gapimiz.device', deviceJson({ uiLang: lang, activeProfileId: id, ...device })],
  )
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const row = {
    id,
    name: name ?? NAMES[lang][kind],
    avatar: 'musicha',
    kind,
    speechLang: lang === 'ru' ? 'ru' : 'uz',
    speechLangFollowsUi: true,
    createdAt: 1,
    ...profile,
  }
  const writeRows = (arg) => page.evaluate(
    async ([row, rows]) => {
      const open = () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open('gapimiz')
          r.onsuccess = () => resolve(r.result)
          r.onerror = () => reject(r.error)
        })
      let db
      for (let i = 0; i < 60; i++) {
        db = await open()
        if (db.objectStoreNames.contains('profiles')) break
        db.close()
        await new Promise((r) => setTimeout(r, 250))
      }
      const put = (store, items) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite')
          for (const it of items) tx.objectStore(store).put(it)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      await put('profiles', [row])
      for (const [store, items] of Object.entries(rows)) await put(store, items)
      db.close()
    },
    arg,
  )
  for (let attempt = 0; ; attempt++) {
    try {
      await writeRows([row, rows])
      break
    } catch (e) {
      if (attempt >= 4) throw e
      await page.waitForTimeout(800)
    }
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => undefined)
}

/** Demo rows for the progress screens: a week of AAC use, games, a custom card and a sticker. */
export function demoRows(profileId = 'p-test') {
  const day = 86400000
  const now = Date.now()
  const events = []
  const words = ['water', 'eat', 'help', 'yes', 'no', 'more', 'mom', 'play']
  for (let d = 0; d < 9; d++) {
    for (let i = 0; i < 4 + (d % 3); i++) events.push({ profileId, type: 'aac_word', ref: words[(d + i) % words.length], ts: now - d * day - i * 60000, meta: {} })
    events.push({ profileId, type: 'aac_phrase', ref: 'help', ts: now - d * day - 5000 })
    events.push({ profileId, type: 'game_round', ref: 'find', ts: now - d * day - 9000, meta: { ok: true, level: 1 } })
    events.push({ profileId, type: 'session_start', ref: 'app', ts: now - d * day - 20000 })
  }
  return { events }
}
