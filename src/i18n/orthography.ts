import type { UzScript } from './types'

/** U+02BB MODIFIER LETTER TURNED COMMA — the letter mark in oʻ and gʻ. */
export const OKINA = 'ʻ'
/** U+02BC MODIFIER LETTER APOSTROPHE — the tutuq belgisi (separation mark). */
export const TUTUQ = 'ʼ'

const APOSTROPHES = /['‘’`ʼʻ]/
const AFTER_O_G = /([oOgG])['‘’`ʼʻ]/g
const OTHER = /(?<![oOgG])['‘’`ʻ]/g

/** Normalizes every apostrophe-like character in Uzbek Latin text to ʻ (after o/g) or ʼ (elsewhere). */
export function normalizeUz(text: string): string {
  if (!APOSTROPHES.test(text)) return text
  return text.replace(AFTER_O_G, `$1${OKINA}`).replace(OTHER, TUTUQ)
}

// Russian loanwords whose Cyrillic spelling cannot be derived letter by letter (ц, я after consonant, ь).
const CYRL_EXCEPTIONS: Record<string, string> = {
  sirk: 'цирк',
  sirkul: 'циркул',
  sement: 'цемент',
  konsert: 'концерт',
  litsey: 'лицей',
  sentabr: 'сентябр',
  oktabr: 'октябр',
  kompyuter: 'компьютер',
  ensiklopediya: 'энциклопедия',
  respublika: 'республика',
}

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л',
  m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х',
  y: 'й', z: 'з',
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

function withCase(cyr: string, upper: boolean): string {
  return upper ? cyr.toUpperCase() : cyr
}

function applyWordCase(source: string, target: string): string {
  if (source.length > 1 && source === source.toUpperCase()) return target.toUpperCase()
  if (source[0] && source[0] !== source[0].toLowerCase()) return target[0].toUpperCase() + target.slice(1)
  return target
}

function wordToCyrl(word: string): string {
  const exception = CYRL_EXCEPTIONS[word.toLowerCase()]
  if (exception) return applyWordCase(word, exception)

  let out = ''
  let i = 0
  while (i < word.length) {
    const ch = word[i]
    const lower = ch.toLowerCase()
    const upper = ch !== lower
    const next = word[i + 1]
    const nextLower = next?.toLowerCase()

    if ((lower === 'o' || lower === 'g') && next === OKINA) {
      out += withCase(lower === 'o' ? 'ў' : 'ғ', upper)
      i += 2
      continue
    }
    if (lower === 's' && nextLower === 'h') {
      out += withCase('ш', upper)
      i += 2
      continue
    }
    if (lower === 'c' && nextLower === 'h') {
      out += withCase('ч', upper)
      i += 2
      continue
    }
    if (lower === 'y' && nextLower) {
      const afterNext = word[i + 2]
      const iotated: Record<string, string> = { u: 'ю', a: 'я', e: 'е' }
      if (nextLower === 'o' && afterNext !== OKINA) {
        out += withCase('ё', upper)
        i += 2
        continue
      }
      if (iotated[nextLower]) {
        out += withCase(iotated[nextLower], upper)
        i += 2
        continue
      }
    }
    if (lower === 'e') {
      const prev = word[i - 1]?.toLowerCase()
      const prevIsVowel = prev !== undefined && (VOWELS.has(prev) || (prev === OKINA && word[i - 2]?.toLowerCase() === 'o'))
      out += withCase(i === 0 || prevIsVowel ? 'э' : 'е', upper)
      i += 1
      continue
    }
    if (ch === TUTUQ) {
      const prev = word[i - 1]?.toLowerCase()
      // sʼh / cʼh only separate letters that would otherwise form a digraph; Cyrillic needs no mark.
      if (!((prev === 's' || prev === 'c') && nextLower === 'h')) out += 'ъ'
      i += 1
      continue
    }
    const mapped = SINGLE[lower]
    out += mapped ? withCase(mapped, upper) : ch
    i += 1
  }
  return out
}

const WORD = /[A-Za-zʻʼ]+/g

/** Converts canonical Uzbek Latin (1995) text to Uzbek Cyrillic. */
export function uzLatnToCyrl(text: string): string {
  return normalizeUz(text).replace(WORD, wordToCyrl)
}

const LATN2026: Array<[RegExp, string]> = [
  [/SH/g, 'Ş'],
  [/Sh/g, 'Ş'],
  [/sh/g, 'ş'],
  [/CH/g, 'Ç'],
  [/Ch/g, 'Ç'],
  [/ch/g, 'ç'],
  [/Oʻ/g, 'Ö'],
  [/oʻ/g, 'ö'],
  [/Gʻ/g, 'Ğ'],
  [/gʻ/g, 'ğ'],
]

/** Converts canonical Uzbek Latin (1995) to the reformed 2026 Latin alphabet (Ş Ç Ö Ğ). */
export function uzLatnToLatn2026(text: string): string {
  let out = normalizeUz(text)
  for (const [pattern, replacement] of LATN2026) out = out.replace(pattern, replacement)
  return out
}

/** Renders canonical Uzbek text in the requested script. */
export function displayUz(text: string, script: UzScript): string {
  if (script === 'cyrl') return uzLatnToCyrl(text)
  if (script === 'latn2026') return uzLatnToLatn2026(text)
  return normalizeUz(text)
}
