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

const cyrCache = new Map<string, string>()
function cachedDisplay(text: string, script: UzScript): string {
  if (script !== 'cyrl') return displayUz(text, script)
  let v = cyrCache.get(text)
  if (v === undefined) {
    v = displayUz(text, 'cyrl')
    if (cyrCache.size > 4000) cyrCache.clear()
    cyrCache.set(text, v)
  }
  return v
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
  const { ui } = useI18n()
  return useCallback(
    (key: K, vars?: Record<string, string | number>) => formatVars(ui({ uz: dict.uz[key], ru: dict.ru[key] }), vars),
    [ui, dict],
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
