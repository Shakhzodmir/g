import { useCallback } from 'react'
import { htmlLangOf, renderBi, renderWithVars, type Bi, type UiLang } from '../../i18n'
import { useDevice } from '../../store/device'
import { P, type PKey } from './strings'

/** The language a sheet is printed in. It starts as the interface language but is a separate choice: the paper may be for someone else. */
export type SheetLang = UiLang

export const SHEET_LANGS: readonly SheetLang[] = ['uz', 'uzc', 'ru']

/** Translator for sheet text in `lang` (placeholders are filled after the script conversion, so numbers and names stay as typed). */
export function useSheetT(lang: SheetLang) {
  const uzScript = useDevice((s) => s.uzScript)
  return useCallback((key: PKey, vars?: Record<string, string | number>) => renderWithVars({ uz: P.uz[key], ru: P.ru[key] }, lang, uzScript, vars), [lang, uzScript])
}

/** Renderer for bilingual content (exercise names and instructions) in the sheet language. */
export function useSheetBi(lang: SheetLang) {
  const uzScript = useDevice((s) => s.uzScript)
  return useCallback((bi: Bi) => renderBi(bi, lang, uzScript), [lang, uzScript])
}

/** The same title in the other language family (Russian under Uzbek, Uzbek Latin under Russian): the paper reads in both. */
export function useSheetSubtitle(lang: SheetLang) {
  return useCallback((key: PKey) => renderBi({ uz: P.uz[key], ru: P.ru[key] }, lang === 'ru' ? 'uz' : 'ru', 'latn'), [lang])
}

export { htmlLangOf }
