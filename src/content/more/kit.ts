import { word } from '../build'
import type { Audience, Fitz, Phrase, TopicId, Word } from '../types'

/*
 * Helpers for the children's vocabulary extensions (src/content/more.ts and more/*.ts).
 * Conventions (same as vocab.ts): uz = canonical Uzbek Latin (U+02BB in oʻ/gʻ, U+02BC tutuq); ruTts has "+" before the
 * stressed vowel of every word with 2+ syllables (ё marked); Russian is child-directed, literal and gender-neutral.
 */

const UZ_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'oʻ'])
const RU_VOWELS = new Set('аеёиоуыэюя'.split(''))
const RU_SONORANT = new Set('йлмнр'.split(''))

/** Letters of a word: oʻ, gʻ, sh, ch are single letters, the tutuq sticks to the letter before it; ь and ъ stick to the previous consonant. */
function letters(w: string, lang: 'uz' | 'ru'): string[] {
  const out: string[] = []
  const low = w.toLowerCase()
  for (let i = 0; i < w.length; i++) {
    const c = low[i]
    const n = low[i + 1]
    if (lang === 'uz' && (((c === 'o' || c === 'g') && n === 'ʻ') || (c === 's' && n === 'h') || (c === 'c' && n === 'h'))) {
      out.push(w.slice(i, i + 2))
      i++
    } else if (lang === 'uz' && c === 'ʼ' && out.length) out[out.length - 1] += w[i]
    else if (lang === 'ru' && (c === 'ь' || c === 'ъ') && out.length) out[out.length - 1] += w[i]
    else out.push(w[i])
  }
  return out
}

/**
 * Syllable split of a single word with "-". This is the same rule as the games' fallback splitter
 * (src/features/games/logic/syllables.ts), so curated and heuristic splits always agree (test in syllables.test.ts):
 * V-CV; Uzbek closes syllables (shaf-to-li: only the last consonant of a cluster moves on); Russian opens them
 * (ко-шка) but keeps й / л / м / н / р behind another consonant (чай-ник, мор-ковь).
 */
export function splitWord(w: string, lang: 'uz' | 'ru'): string {
  const l = letters(w, lang)
  const isVowel = (x: string) => (lang === 'uz' ? UZ_VOWELS.has(x.toLowerCase().replace('ʼ', '')) : RU_VOWELS.has(x[0].toLowerCase()))
  const v = l.flatMap((x, i) => (isVowel(x) ? [i] : []))
  if (v.length <= 1) return w
  const cuts: number[] = []
  for (let k = 0; k < v.length - 1; k++) {
    const a = v[k]
    const b = v[k + 1]
    const cluster = b - a - 1
    if (cluster <= 1) cuts.push(a + 1)
    else if (lang === 'uz') cuts.push(b - 1)
    else cuts.push(RU_SONORANT.has(l[a + 1][0].toLowerCase()) ? a + 2 : a + 1)
  }
  const parts: string[] = []
  let from = 0
  for (const c of cuts) {
    parts.push(l.slice(from, c).join(''))
    from = c
  }
  parts.push(l.slice(from).join(''))
  return parts.join('-')
}

/** `[uz, ru]` syllables of a concrete single-word noun. */
const syl = (uz: string, ru: string): [string, string] => [splitWord(uz, 'uz'), splitWord(ru, 'ru')]

export type Mk = (id: string, uz: string, ru: string, ruTts: string, symbol: string, syllables?: boolean, audience?: Audience) => Word

/**
 * A word factory bound to a topic, a part-of-speech colour and (optionally) a default audience.
 * `syllables = true` derives the syllable split from uz / ru (single words only).
 */
export function mk(topic: TopicId, fitz: Fitz, defaultAudience?: Audience): Mk {
  return (id, uz, ru, ruTts, symbol, syllables, audience) => word(topic, fitz, id, uz, ru, ruTts, symbol, syllables ? syl(uz, ru) : undefined, audience ?? defaultAudience)
}

/** Like mk() but the part of speech is given per word. */
export function mkf(topic: TopicId, defaultAudience?: Audience) {
  return (fitz: Fitz, id: string, uz: string, ru: string, ruTts: string, symbol: string, syllables?: boolean, audience?: Audience): Word =>
    word(topic, fitz, id, uz, ru, ruTts, symbol, syllables ? syl(uz, ru) : undefined, audience ?? defaultAudience)
}

/** A child phrase (audience 'kid' unless 'both' is passed). */
export const kidPhrase = (id: string, uz: string, ru: string, ruTts: string, symbol: string, audience: Phrase['audience'] = 'kid'): Phrase => ({
  id,
  uz,
  ru,
  ruTts,
  symbol,
  audience,
})
