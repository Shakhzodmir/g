import { useCallback } from 'react'
import { formatVars, useI18n } from '../../i18n'
import { H, type HKey } from './strings'

/**
 * Typed translator for this feature. Placeholders are filled BEFORE the text is rendered: the shared useStrings()
 * transliterates first, which would turn "{n}" into "{н}" in Uzbek Cyrillic.
 */
export function useH() {
  const { ui } = useI18n()
  return useCallback((key: HKey, vars?: Record<string, string | number>) => ui({ uz: formatVars(H.uz[key], vars), ru: formatVars(H.ru[key], vars) }), [ui])
}
