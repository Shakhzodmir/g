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

/**
 * Russian loanwords whose Cyrillic spelling cannot be derived letter by letter (ц, я after a consonant, ь).
 * Keys are STEMS: Uzbek suffixes after them are converted normally and appended
 * («multfilmlar» → «мультфильмлар», «litsenziyasi» → «лицензияси»).
 */
const CYRL_EXCEPTIONS: Record<string, string> = {
  sirk: 'цирк',
  sirkul: 'циркул',
  sement: 'цемент',
  konsert: 'концерт',
  litsey: 'лицей',
  litsenziya: 'лицензия',
  sentabr: 'сентябр',
  oktabr: 'октябр',
  kompyuter: 'компьютер',
  multfilm: 'мультфильм',
  ensiklopediya: 'энциклопедия',
  respublika: 'республика',
}
const EXCEPTION_STEMS = Object.keys(CYRL_EXCEPTIONS).sort((a, b) => b.length - a.length)

/** Common Uzbek suffix pieces that may follow an exception stem (plural, case, possessive, derivation). */
const SUFFIXES =
  'lar|ni|ning|ga|ka|qa|da|dan|ta|ning|im|ing|imiz|ingiz|i|si|ini|ini|ida|idan|iga|lari|larni|ning|dagi|dek|day|cha|chi|li|siz|lik|ligi|gi|ki|niki|mi|ku|oq|ham|gina'
const SUFFIX_ONLY = new RegExp(`^(?:${SUFFIXES})+$`)

function matchException(lower: string): { stem: string; rest: string } | undefined {
  for (const stem of EXCEPTION_STEMS) {
    if (lower === stem) return { stem, rest: '' }
    if (lower.startsWith(stem)) {
      const rest = lower.slice(stem.length)
      if (SUFFIX_ONLY.test(rest)) return { stem, rest }
    }
  }
  return undefined
}

/**
 * Words that must stay Latin when the interface is shown in Cyrillic: acronyms, brands, key names and
 * file formats. Matching is by exact spelling. Tokens that mix capitals with digits («A4», «MP3») and
 * CamelCase brands («GitHub», «MediaPipe») are kept automatically.
 */
export const KEEP_LATIN_WORDS: ReadonlySet<string> = new Set([
  'AAC', 'NCAEP', 'ASHA', 'USB', 'PDF', 'PIN', 'A4', 'GitHub', 'Gapimiz', 'Enter', 'Silero', 'Fluent', 'MediaPipe',
  'WebM', 'MP3', 'PNG', 'SVG', 'JSON', 'PWA', 'Wi-Fi', 'WiFi', 'TTS', 'Nunito', 'Onest', 'Dexie', 'React',
])

/** True when this Latin token must not be transliterated (whitelist, ALL-CAPS acronym with a digit, CamelCase brand). */
export function isKeptLatin(word: string): boolean {
  // Exact spelling only: «Tab», «Alt», «pin» in lower case are ordinary Uzbek syllables/words.
  if (KEEP_LATIN_WORDS.has(word)) return true
  if (/\d/.test(word) && /[A-Z]/.test(word)) return true // A4, MP3, H2O
  if (/[a-z][A-Z]/.test(word)) return true // GitHub, MediaPipe
  return false
}

/** Markers that protect a span from transliteration (private-use characters; stripped on output). */
export const KEEP_OPEN = ''
export const KEEP_CLOSE = ''
const KEEP_SPAN = /([^]*)/g
const KEEP_CHARS = /[]/g

/**
 * Marks text (a profile name, a brand, anything typed by a person) that must be shown exactly as it is,
 * in every script: `uzLatnToCyrl(\`Salom, ${keepLatin('Aziz')}!\`)` → «Салом, Aziz!». Safe to pass through
 * `displayUz`/`renderBi`; the markers never reach the screen.
 */
export function keepLatin(text: string): string {
  return KEEP_OPEN + text.replace(KEEP_CHARS, '') + KEEP_CLOSE
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
  if (isKeptLatin(word)) return word
  const hit = matchException(word.toLowerCase())
  if (hit) {
    const stem = applyWordCase(word.slice(0, hit.stem.length), CYRL_EXCEPTIONS[hit.stem])
    // Whole word in capitals → the suffix stays capital as well.
    const rest = hit.rest ? wordToCyrl(word.slice(hit.stem.length)) : ''
    return stem + rest
  }

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

const WORD = /[A-Za-zʻʼ0-9]+(?:-[A-Za-zʻʼ][A-Za-zʻʼ0-9]*)*/g

/** Runs `convert` on the text outside keepLatin() spans and puts the spans back untouched (markers removed). */
function withKeptSpans(text: string, convert: (outside: string) => string): string {
  if (!text.includes(KEEP_OPEN)) return convert(text)
  const kept: string[] = []
  const protectedText = text.replace(KEEP_SPAN, (_m, inner: string) => {
    kept.push(inner)
    return `${kept.length - 1}`
  })
  return convert(protectedText)
    .replace(/(\d+)/g, (_m, i: string) => kept[Number(i)])
    .replace(KEEP_CHARS, '')
}

/** Converts canonical Uzbek Latin (1995) text to Uzbek Cyrillic. Acronyms, brands and keepLatin() spans stay Latin. */
export function uzLatnToCyrl(text: string): string {
  return withKeptSpans(normalizeUz(text), (t) => t.replace(WORD, convertToken))
}

function convertToken(token: string): string {
  if (isKeptLatin(token)) return token
  // Hyphenated words (Wi-Fi, ota-ona): convert every part.
  if (token.includes('-')) return token.split('-').map(wordToCyrl).join('-')
  return wordToCyrl(token)
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
  return withKeptSpans(normalizeUz(text), (t) =>
    t.replace(WORD, (token) => {
      if (isKeptLatin(token)) return token
      let out = token
      for (const [pattern, replacement] of LATN2026) out = out.replace(pattern, replacement)
      return out
    }),
  )
}

/** Renders canonical Uzbek text in the requested script. keepLatin() markers are honoured (and removed) in every script. */
export function displayUz(text: string, script: UzScript): string {
  if (script === 'cyrl') return uzLatnToCyrl(text)
  if (script === 'latn2026') return uzLatnToLatn2026(text)
  return withKeptSpans(normalizeUz(text), (t) => t)
}

const CYR_TO_LATN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sh', ъ: TUTUQ, ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h',
}
const CYR_VOWEL_LETTERS = new Set(Array.from('аеёиоуэюяўАЕЁИОУЭЮЯЎ'))

/**
 * Uzbek Cyrillic → canonical Uzbek Latin (1995), so typed Cyrillic Uzbek (a card label, a message) can be
 * spoken by the Uzbek voice and stored in the canonical form. `е` is `ye` at the start of a word and after
 * a vowel or a separator sign, otherwise `e`. Text without Cyrillic is returned normalized (apostrophes).
 */
export function uzCyrlToLatn(text: string): string {
  if (!/[Ѐ-ӿ]/.test(text)) return normalizeUz(text)
  let out = ''
  const chars = Array.from(text)
  chars.forEach((ch, i) => {
    const lower = ch.toLowerCase()
    const upper = ch !== lower
    let mapped: string | undefined
    if (lower === 'е') {
      const prev = chars[i - 1]
      const atStart = !prev || !/\p{L}/u.test(prev)
      mapped = atStart || CYR_VOWEL_LETTERS.has(prev) || prev === 'ъ' || prev === 'ь' || prev === 'Ъ' || prev === 'Ь' ? 'ye' : 'e'
    } else mapped = CYR_TO_LATN[lower]
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
