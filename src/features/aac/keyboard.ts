import { normalizeUz, uzCyrlToLatn } from '../../i18n/orthography'
import type { SpeechLang, UzScript } from '../../i18n/types'

export { uzCyrlToLatn }

export type LayoutId = 'uz-latn' | 'uz-latn26' | 'uz-cyrl' | 'ru'

export interface KeyDef {
  /** What the key shows. */
  label: string
  /** What the key types. */
  insert: string
}

export interface KeyboardLayout {
  id: LayoutId
  rows: KeyDef[][]
}

const keys = (s: string): KeyDef[] => Array.from(s).map((ch) => ({ label: ch, insert: ch }))
const DIGITS = keys('1234567890')
/** Punctuation row shared by every layout (hyphen for compound words, digits are a row of their own). */
const PUNCT = keys(',.?!-')

/*
 * Uzbek Latin (1995): the familiar QWERTY rows plus oʻ, gʻ and the tutuq belgisi. Typed text uses ‘ and ’
 * for display (Nunito renders U+02BB/U+02BC with a wide gap); speech normalizes them to ʻ/ʼ.
 */
const UZ_LATN: KeyboardLayout = {
  id: 'uz-latn',
  rows: [
    DIGITS,
    keys('qwertyuiop'),
    keys('asdfghjkl'),
    [...keys('zxcvbnm')],
    [
      { label: 'o‘', insert: 'o‘' },
      { label: 'g‘', insert: 'g‘' },
      { label: '’', insert: '’' },
      ...PUNCT,
    ],
  ],
}

/*
 * Uzbek Latin 2026 (Ş Ç Ö Ğ): one key per letter, no ‘ keys; the tutuq belgisi stays. Typed text is converted
 * back to the canonical 1995 spelling (Sh Ch Oʻ Gʻ) before it is spoken or predicted.
 */
const UZ_LATN26: KeyboardLayout = {
  id: 'uz-latn26',
  rows: [DIGITS, keys('qwertyuiop'), keys('asdfghjkl'), [...keys('zxcvbnm')], [...keys('şçöğ'), { label: '’', insert: '’' }, ...PUNCT]],
}

/* Uzbek Cyrillic plus щ ы (loanwords and names), a digit row and punctuation with the hyphen. */
const UZ_CYRL: KeyboardLayout = {
  id: 'uz-cyrl',
  rows: [DIGITS, keys('йцукенгшўзхъ'), keys('фқвапролджэ'), keys('ячсмитьбюҳғё'), [...keys('щы'), ...PUNCT]],
}

const RU: KeyboardLayout = {
  id: 'ru',
  rows: [DIGITS, keys('йцукенгшщзхъ'), keys('фывапролджэ'), keys('ячсмитьбюёы'), PUNCT],
}

export const LAYOUTS: Record<LayoutId, KeyboardLayout> = { 'uz-latn': UZ_LATN, 'uz-latn26': UZ_LATN26, 'uz-cyrl': UZ_CYRL, ru: RU }

/** The layout follows what is spoken: Russian speech → Russian keys; Uzbek → the device's Uzbek script. */
export function layoutFor(speechLang: SpeechLang, uzScript: UzScript): LayoutId {
  if (speechLang === 'ru') return 'ru'
  if (uzScript === 'latn2026') return 'uz-latn26'
  return uzScript === 'cyrl' ? 'uz-cyrl' : 'uz-latn'
}

const LATN2026_BACK: Array<[RegExp, string]> = [
  [/Ş/g, 'Sh'],
  [/ş/g, 'sh'],
  [/Ç/g, 'Ch'],
  [/ç/g, 'ch'],
  [/Ö/g, 'Oʻ'],
  [/ö/g, 'oʻ'],
  [/Ğ/g, 'Gʻ'],
  [/ğ/g, 'gʻ'],
]

/** 2026 Latin → canonical Uzbek Latin (1995). Text without 2026 letters is returned unchanged. */
export function latn2026ToLatn(text: string): string {
  let out = text
  for (const [pattern, replacement] of LATN2026_BACK) out = out.replace(pattern, replacement)
  return out
}

/**
 * Whatever the person typed (any Uzbek script, or Russian) → canonical Uzbek Latin 1995 with ʻ ʼ.
 * Works on the text itself, not on the active layout, so mixed or older text (history) is handled too.
 */
export function toCanonicalUz(text: string): string {
  return normalizeUz(uzCyrlToLatn(latn2026ToLatn(text)))
}
