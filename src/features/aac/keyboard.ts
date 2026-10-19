import type { SpeechLang, UzScript } from '../../i18n/types'

export type LayoutId = 'uz-latn' | 'uz-cyrl' | 'ru'

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
const PUNCT = keys(',.?')

/*
 * Uzbek Latin: the familiar QWERTY rows plus oʻ, gʻ and the tutuq belgisi. Typed text uses ‘ and ’
 * for display (Nunito renders U+02BB/U+02BC with a wide gap); speech normalizes them to ʻ/ʼ.
 */
const UZ_LATN: KeyboardLayout = {
  id: 'uz-latn',
  rows: [
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

const UZ_CYRL: KeyboardLayout = {
  id: 'uz-cyrl',
  rows: [keys('йцукенгшўзхъ'), keys('фқвапролджэ'), keys('ячсмитьбюҳғё'), PUNCT],
}

const RU: KeyboardLayout = {
  id: 'ru',
  rows: [keys('йцукенгшщзхъ'), keys('фывапролджэ'), keys('ячсмитьбюё'), PUNCT],
}

export const LAYOUTS: Record<LayoutId, KeyboardLayout> = { 'uz-latn': UZ_LATN, 'uz-cyrl': UZ_CYRL, ru: RU }

/** The layout follows what is spoken: Russian speech → Russian keys; Uzbek → the device's Uzbek script. */
export function layoutFor(speechLang: SpeechLang, uzScript: UzScript): LayoutId {
  if (speechLang === 'ru') return 'ru'
  return uzScript === 'cyrl' ? 'uz-cyrl' : 'uz-latn'
}

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sh', ъ: 'ʼ', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h',
}
const CYR_VOWELS = new Set(Array.from('аеёиоуэюяўАЕЁИОУЭЮЯЎ'))

/**
 * Uzbek Cyrillic → canonical Uzbek Latin (1995), so typed Cyrillic Uzbek can be spoken by an Uzbek voice.
 * `е` is `ye` at the start of a word and after a vowel or a separator sign, otherwise `e`.
 */
export function uzCyrlToLatn(text: string): string {
  let out = ''
  const chars = Array.from(text)
  chars.forEach((ch, i) => {
    const lower = ch.toLowerCase()
    const upper = ch !== lower
    let mapped: string | undefined
    if (lower === 'е') {
      const prev = chars[i - 1]
      const atStart = !prev || !/\p{L}/u.test(prev)
      mapped = atStart || CYR_VOWELS.has(prev) || prev === 'ъ' || prev === 'ь' || prev === 'Ъ' || prev === 'Ь' ? 'ye' : 'e'
    } else mapped = CYR[lower]
    if (mapped === undefined) {
      out += ch
      return
    }
    if (!upper || !mapped) {
      out += mapped
      return
    }
    // Whole word in capitals → keep digraphs capital too (SH), otherwise title case (Sh).
    const next = chars[i + 1]
    const nextUpper = next !== undefined && next !== next.toLowerCase()
    out += nextUpper ? mapped.toUpperCase() : mapped.charAt(0).toUpperCase() + mapped.slice(1)
  })
  return out
}
