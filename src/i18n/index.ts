import { useCallback } from 'react'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { displayUz } from './orthography'
import type { Bi, SpeechLang, UiLang, UzScript } from './types'

export type { Bi, SpeechLang, UiLang, UzScript }

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
function cachedDisplay(text: string, script: UzScript): string {
  if (script === 'latn') return prettyUz(displayUz(text, 'latn'))
  if (script !== 'cyrl') return displayUz(text, script)
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
      if (m) return m[1] in vars ? String(vars[m[1]]) : part
      return part ? renderBi({ uz: part, ru: part }, lang, uzScript) : ''
    })
    .join('')
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

/** Non-hook variant for imperative code (e.g. building aria labels outside render). */
export function labelNow(bi: Bi, lang: SpeechLang): string {
  return lang === 'ru' ? bi.ru : cachedDisplay(bi.uz, useDevice.getState().uzScript)
}
