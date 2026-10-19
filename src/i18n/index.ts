import { useCallback } from 'react'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { displayUz } from './orthography'
import type { Bi, SpeechLang, UiLang, UzScript } from './types'

export type { Bi, SpeechLang, UiLang, UzScript }
export { keepLatin, uzCyrlToLatn, uzLatnToCyrl } from './orthography'

/** A namespace of UI strings. Russian must define exactly the Uzbek keys (checked by TypeScript). */
export interface Dict<K extends string> {
  uz: Record<K, string>
  ru: Record<K, string>
}

export function defineStrings<const U extends Record<string, string>>(dict: {
  uz: U
  ru: { [K in keyof U]: string }
}): Dict<Extract<keyof U, string>> {
  return dict as unknown as Dict<Extract<keyof U, string>>
}

/**
 * Visual form of Uzbek Latin: data keeps U+02BB/U+02BC (correct for TTS and search), but on screen
 * ‘ and ’ are used — in Nunito the modifier letters render with a wide gap ("O ʻyinlar").
 */
export function prettyUz(text: string): string {
  return text.replace(/ʻ/g, '‘').replace(/ʼ/g, '’')
}

const cyrCache = new Map<string, string>()
/**
 * ONE rule for every on-screen Uzbek string: Latin scripts (1995 and 2026) go through prettyUz, Cyrillic is
 * converted (and cached). Data keeps ʻ/ʼ; only the rendered text has the tighter glyphs.
 */
function cachedDisplay(text: string, script: UzScript): string {
  if (script !== 'cyrl') return prettyUz(displayUz(text, script))
  let v = cyrCache.get(text)
  if (v === undefined) {
    v = displayUz(text, 'cyrl')
    if (cyrCache.size > 4000) cyrCache.clear()
    cyrCache.set(text, v)
  }
  return v
}

/**
 * Renders bilingual text with `{placeholders}`: the text around placeholders is converted to the target
 * script, then values are inserted untouched (so `{n}` never becomes `{н}` in Cyrillic and numbers/names stay as typed).
 */
export function renderWithVars(bi: Bi, lang: UiLang, uzScript: UzScript, vars?: Record<string, string | number>): string {
  const raw = lang === 'ru' ? bi.ru : bi.uz
  if (!vars || !raw.includes('{')) return renderBi(bi, lang, uzScript)
  const parts = raw.split(/(\{\w+\})/)
  return parts
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part)
      if (m) return m[1] in vars ? prettyVar(vars[m[1]]) : part
      return part ? renderBi({ uz: part, ru: part }, lang, uzScript) : ''
    })
    .join('')
}

/** Variable values (names, numbers) are inserted exactly as typed; only the Uzbek letter marks get the tighter glyphs. */
function prettyVar(v: string | number): string {
  return typeof v === 'string' ? prettyUz(v) : String(v)
}

export function renderBi(bi: Bi, lang: UiLang, uzScript: UzScript): string {
  if (lang === 'ru') return bi.ru
  const script: UzScript = lang === 'uzc' ? 'cyrl' : uzScript === 'latn2026' ? 'latn2026' : 'latn'
  return cachedDisplay(bi.uz, script)
}

export function formatVars(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Decimal comma in every UI language (Russian and Uzbek both write 1,5), never "1.5". */
export function formatNumber(n: number, _uiLang: UiLang = 'ru', maxFractionDigits = 2): string {
  const rounded = Number(n.toFixed(maxFractionDigits))
  return String(rounded).replace('.', ',')
}

export type UnitId = 'cm' | 'm' | 's' | 'min' | 'ms' | 'x'

const UNITS: Record<UiLang, Record<UnitId, string>> = {
  uz: { cm: 'sm', m: 'm', s: 's', min: 'daq', ms: 'ms', x: '×' },
  uzc: { cm: 'см', m: 'м', s: 'с', min: 'дақ', ms: 'мс', x: '×' },
  ru: { cm: 'см', m: 'м', s: 'с', min: 'мин', ms: 'мс', x: '×' },
}

/** Unit label in the UI language and script («sm» / «см»). */
export function unit(uiLang: UiLang, id: UnitId): string {
  return UNITS[uiLang][id]
}

/** «80 см» / «1,5 с» / «×1,5»: localised number + unit, joined with a no-break space. */
export function formatQuantity(n: number, id: UnitId, uiLang: UiLang): string {
  if (id === 'x') return `×${formatNumber(n, uiLang)}`
  return `${formatNumber(n, uiLang)} ${unit(uiLang, id)}`
}

/**
 * UI-language subtitle for a bilingual item that is SPOKEN in another language (ru UI + uz speech, or the
 * reverse). Returns null when the UI rendering equals the speech rendering, so callers show it only when useful.
 */
export function subtitle(bi: Bi, uiLang: UiLang, speechLang: SpeechLang, uzScript: UzScript): string | null {
  const spoken = speechLang === 'ru' ? bi.ru : cachedDisplay(bi.uz, uzScript)
  const shown = renderBi(bi, uiLang, uzScript)
  return shown === spoken || !shown.trim() ? null : shown
}

export function htmlLangOf(lang: UiLang): string {
  return lang === 'ru' ? 'ru' : lang === 'uzc' ? 'uz-Cyrl' : 'uz-Latn'
}

/** Current UI language plus a renderer for bilingual text in that language/script. */
export function useI18n() {
  const uiLang = useDevice((s) => s.uiLang)
  const uzScript = useDevice((s) => s.uzScript)
  const ui = useCallback((bi: Bi) => renderBi(bi, uiLang, uzScript), [uiLang, uzScript])
  return { uiLang, uzScript, ui, htmlLang: htmlLangOf(uiLang) }
}

/** Typed translator for one strings namespace: `const t = useStrings(S); t('title')`. */
export function useStrings<K extends string>(dict: Dict<K>) {
  const { uiLang, uzScript } = useI18n()
  return useCallback(
    (key: K, vars?: Record<string, string | number>) => renderWithVars({ uz: dict.uz[key], ru: dict.ru[key] }, uiLang, uzScript, vars),
    [uiLang, uzScript, dict],
  )
}

/**
 * Label renderer for spoken content (AAC cards, game words): shows the text in the profile's SPEECH
 * language so what is shown is what is heard. Uzbek uses the device's chosen script.
 */
export function useLabel() {
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const uzScript = useDevice((s) => s.uzScript)
  return useCallback(
    (bi: Bi) => (speechLang === 'ru' ? bi.ru : cachedDisplay(bi.uz, uzScript)),
    [speechLang, uzScript],
  )
}

/** Hook form of `subtitle`: `const sub = useSubtitle(); sub(word)` → UI-language text or null. */
export function useSubtitle() {
  const uiLang = useDevice((s) => s.uiLang)
  const uzScript = useDevice((s) => s.uzScript)
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  return useCallback((bi: Bi) => subtitle(bi, uiLang, speechLang, uzScript), [uiLang, uzScript, speechLang])
}

/** Non-hook variant for imperative code (e.g. building aria labels outside render). */
export function labelNow(bi: Bi, lang: SpeechLang): string {
  return lang === 'ru' ? bi.ru : cachedDisplay(bi.uz, useDevice.getState().uzScript)
}
