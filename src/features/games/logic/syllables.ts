import type { Word } from '../../../content/types'
import type { SpeechLang } from '../../../i18n/types'
import type { Level } from './rounds'

/*
 * Syllables for "Chapak-chapak". The curated split in `word.syllables` always wins; the heuristic below
 * is only a fallback for words without one (custom words, new vocabulary).
 */

const UZ_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'oʻ'])
const RU_VOWELS = new Set('аеёиоуыэюя'.split(''))
const RU_SONORANT = new Set('йлмнр'.split(''))

/** Uzbek Latin letters: oʻ, gʻ, sh, ch are single letters; the tutuq belgisi sticks to the previous letter. */
function uzLetters(word: string): string[] {
  const out: string[] = []
  const w = word.toLowerCase().replace(/[‘’'`]/g, 'ʻ')
  for (let i = 0; i < w.length; i++) {
    const c = w[i]
    const n = w[i + 1]
    if ((c === 'o' || c === 'g') && n === 'ʻ') {
      out.push(c + n)
      i++
    } else if ((c === 's' || c === 'c') && n === 'h') {
      out.push(c + n)
      i++
    } else if ((c === 'ʼ' || c === 'ʻ') && out.length) {
      out[out.length - 1] += c
    } else out.push(c)
  }
  return out
}

/** Russian letters: soft and hard signs stick to the previous consonant. */
function ruLetters(word: string): string[] {
  const out: string[] = []
  for (const c of word.toLowerCase()) {
    if ((c === 'ь' || c === 'ъ') && out.length) out[out.length - 1] += c
    else out.push(c)
  }
  return out
}

function splitOne(word: string, lang: SpeechLang): string[] {
  const letters = lang === 'uz' ? uzLetters(word) : ruLetters(word)
  const isVowel = (l: string) => (lang === 'uz' ? UZ_VOWELS.has(l.replace('ʼ', '')) : RU_VOWELS.has(l[0]))
  const vowelAt = letters.flatMap((l, i) => (isVowel(l) ? [i] : []))
  if (vowelAt.length <= 1) return [word]

  // Boundaries between consecutive vowels.
  const cuts: number[] = []
  for (let k = 0; k < vowelAt.length - 1; k++) {
    const a = vowelAt[k]
    const b = vowelAt[k + 1]
    const cluster = b - a - 1
    let cut: number
    if (cluster <= 1) cut = a + 1 // V-V or V-CV
    else if (lang === 'uz') cut = b - 1 // Uzbek: closed syllables, only the last consonant moves on (shaf-to-li, mult-film)
    else {
      // Russian: open syllables; й and a sonorant before another consonant stay behind (чай-ник, мор-ковь).
      const first = letters[a + 1][0]
      cut = RU_SONORANT.has(first) ? a + 2 : a + 1
    }
    cuts.push(cut)
  }
  const out: string[] = []
  let from = 0
  for (const c of cuts) {
    out.push(letters.slice(from, c).join(''))
    from = c
  }
  out.push(letters.slice(from).join(''))
  return out
}

/** Heuristic split of a phrase into syllables (lower case). */
export function splitSyllables(text: string, lang: SpeechLang): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => splitOne(w, lang))
}

/** Syllables of a word in the speech language (curated split first). */
export function syllablesOf(word: Pick<Word, 'uz' | 'ru' | 'syllables'>, lang: SpeechLang): string[] {
  const curated = word.syllables?.[lang]
  if (curated) return curated.split('-').map((s) => s.trim()).filter(Boolean)
  return splitSyllables(lang === 'uz' ? word.uz : word.ru, lang)
}

/** Syllable counts allowed per level: 1 → two claps, 2 → two or three, 3 → three to five. */
export const SYLLABLE_RANGE: Record<Level, [min: number, max: number]> = {
  1: [2, 2],
  2: [2, 3],
  3: [3, 5],
}

/** Words with a curated split whose syllable count fits the level, in the given speech language. */
export function syllableWords<W extends Pick<Word, 'id' | 'uz' | 'ru' | 'syllables'>>(words: readonly W[], level: Level, lang: SpeechLang): W[] {
  const [min, max] = SYLLABLE_RANGE[level]
  return words.filter((w) => {
    if (!w.syllables) return false
    const n = syllablesOf(w, lang).length
    return n >= min && n <= max
  })
}
