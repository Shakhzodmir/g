import { useCallback } from 'react'
import { formatVars, renderWithVars, useI18n } from '../../i18n'
import { S, type StrKey } from './strings'

/**
 * Typed translator for this feature. Placeholders are filled BEFORE the text is rendered: the shared useStrings()
 * transliterates first, which would turn "{n}" into "{н}" in Uzbek Cyrillic.
 */
export function useCheckT() {
  const { ui } = useI18n()
  return useCallback((key: StrKey, vars?: Record<string, string | number>) => ui({ uz: formatVars(S.uz[key], vars), ru: formatVars(S.ru[key], vars) }), [ui])
}

/**
 * Both languages at once, for the printed report and the shared text (a specialist may read either): the first is the
 * interface language (Uzbek in the device's script, or Russian), the second is the other one.
 */
export function useBilingual() {
  const { uiLang, uzScript } = useI18n()
  const primary: 'uz' | 'ru' = uiLang === 'ru' ? 'ru' : 'uz'
  const secondary: 'uz' | 'ru' = primary === 'ru' ? 'uz' : 'ru'
  const tr = useCallback(
    (key: StrKey, lang: 'uz' | 'ru', vars?: Record<string, string | number>) => renderWithVars({ uz: S.uz[key], ru: S.ru[key] }, lang === 'ru' ? 'ru' : uiLang === 'uzc' ? 'uzc' : 'uz', uzScript, vars),
    [uiLang, uzScript],
  )
  return { tr, primary, secondary }
}
