/**
 * Syllable-based soft hyphenation for Uzbek (Latin and Cyrillic) and Russian, used so long words in small
 * cells and narrow cards wrap at a syllable ("xoh-lay-man") instead of in the middle of a syllable.
 * Rule used for both languages: one consonant between vowels goes with the next syllable (CV);
 * two or more consonants split after the first (VC-CV). Digraphs sh, ch, ng and the letters oʻ/gʻ count as one.
 */
export const SOFT_HYPHEN = '­'

type Lang = 'uz' | 'ru'

const LATIN_VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const CYR_VOWELS = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'ў'])
const OKINA = 'ʻ'
const TUTUQ = 'ʼ'

function isVowel(token: string): boolean {
  const t = token.toLowerCase()
  if (t === 'oʻ') return true
  return LATIN_VOWELS.has(t) || CYR_VOWELS.has(t)
}

/** Signs that never start a fragment: they are glued to the letter before them (ь ъ й and the tutuq ʼ). */
const GLUED = new Set(['ь', 'ъ', 'й', TUTUQ, OKINA])

interface Unit {
  text: string
  vowel: boolean
}

/** Splits a word into graphemes (digraphs and oʻ/gʻ as single tokens). */
function tokenize(word: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < word.length) {
    const c = word[i]
    const n = word[i + 1]
    const pair = (c + (n ?? '')).toLowerCase()
    if ((pair === 'oʻ' || pair === 'gʻ') && (n === OKINA || n === TUTUQ)) {
      out.push(c + OKINA)
      i += 2
    } else if (pair === 'sh' || pair === 'ch' || pair === 'ng') {
      out.push(c + n)
      i += 2
    } else {
      out.push(c)
      i += 1
    }
  }
  return out
}

/**
 * Tokens → syllable units. ь ъ й and ʼ are glued to the previous unit (consonant+ь is one consonant unit,
 * vowel+й one vowel unit: «боль-шой», «пла-тье», «май-ка»), so no fragment can start with them.
 */
function toUnits(tokens: string[]): Unit[] {
  const units: Unit[] = []
  for (const t of tokens) {
    const prev = units[units.length - 1]
    if (prev && GLUED.has(t.toLowerCase())) prev.text += t
    else units.push({ text: t, vowel: isVowel(t) })
  }
  return units
}

export function syllablesOf(word: string, _lang: Lang = 'uz'): string[] {
  const units = toUnits(tokenize(word))
  const vowelIdx: number[] = []
  units.forEach((u, i) => {
    if (u.vowel) vowelIdx.push(i)
  })
  if (vowelIdx.length < 2) return [word]
  const cuts: number[] = []
  for (let k = 0; k < vowelIdx.length - 1; k++) {
    const a = vowelIdx[k]
    const b = vowelIdx[k + 1]
    const between = b - a - 1
    const nucleusHasGlide = /й$/i.test(units[a].text) // «луй-ста»: the й already closes the syllable
    if (between === 0) cuts.push(b) // vowel + vowel: split between them
    else if (between === 1) cuts.push(/ъ$/i.test(units[a + 1].text) ? b : a + 1) // V-CV; «подъ-езд»
    else cuts.push(nucleusHasGlide ? a + 1 : a + 2) // VC-CV…
  }
  const parts: string[] = []
  let start = 0
  for (const c of cuts) {
    parts.push(units.slice(start, c).map((u) => u.text).join(''))
    start = c
  }
  parts.push(units.slice(start).map((u) => u.text).join(''))
  // Never leave a one-letter fragment (looks like a typo when wrapped): glue it to its neighbour.
  const merged: string[] = []
  for (const p of parts) {
    if (merged.length && p.replace(/[ʻʼ]/g, '').length < 2) merged[merged.length - 1] += p
    else merged.push(p)
  }
  if (merged.length > 1 && merged[0].replace(/[ʻʼ]/g, '').length < 2) {
    merged[1] = merged[0] + merged[1]
    merged.shift()
  }
  return merged
}

const WORD = /[\p{L}ʻʼ]+/gu

/**
 * Inserts soft hyphens into words of `minLength`+ letters (default 7). Safe for display only
 * (not for speech or search); screen readers ignore soft hyphens.
 */
export function shy(text: string, lang: Lang = 'uz', minLength = 7): string {
  return text.replace(WORD, (w) => (w.length >= minLength ? syllablesOf(w, lang).join(SOFT_HYPHEN) : w))
}
