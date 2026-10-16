/** UI language: `uz` = Uzbek Latin (1995 standard), `uzc` = Uzbek Cyrillic, `ru` = Russian. */
export type UiLang = 'uz' | 'uzc' | 'ru'

/** Language of spoken output (audio clips / TTS). Cyrillic Uzbek is spoken as `uz`. */
export type SpeechLang = 'uz' | 'ru'

/** How canonical Uzbek (Latin 1995) text is displayed. `latn2026` follows the 2026 alphabet reform (Ş Ç Ö Ğ). */
export type UzScript = 'latn' | 'cyrl' | 'latn2026'

/**
 * Bilingual text. `uz` is ALWAYS canonical Uzbek Latin (1995) with U+02BB for oʻ/gʻ
 * and U+02BC for the tutuq belgisi; Cyrillic and 2026-Latin forms are derived at runtime.
 */
export interface Bi {
  uz: string
  ru: string
}
