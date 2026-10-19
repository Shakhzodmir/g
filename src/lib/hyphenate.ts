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

export function syllablesOf(word: string, _lang: Lang = 'uz'): string[] {
  const tokens = tokenize(word)
  const vowelIdx: number[] = []
  tokens.forEach((t, i) => {
    if (isVowel(t)) vowelIdx.push(i)
  })
  if (vowelIdx.length < 2) return [word]
  const cuts: number[] = []
  for (let k = 0; k < vowelIdx.length - 1; k++) {
    const a = vowelIdx[k]
    const b = vowelIdx[k + 1]
    const between = b - a - 1
    if (between === 0) cuts.push(b) // vowel + vowel: split between them
    else if (between === 1) cuts.push(a + 1) // V-CV
    else cuts.push(a + 2) // VC-CV…
  }
  const parts: string[] = []
  let start = 0
  for (const c of cuts) {
    parts.push(tokens.slice(start, c).join(''))
    start = c
  }
  parts.push(tokens.slice(start).join(''))
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

const WORD = /[\p{L}ʻʼ]{7,}/gu

/** Inserts soft hyphens into words of 7+ letters. Safe for display only (not for speech or search). */
export function shy(text: string, lang: Lang = 'uz'): string {
  return text.replace(WORD, (w) => syllablesOf(w, lang).join(SOFT_HYPHEN))
}
