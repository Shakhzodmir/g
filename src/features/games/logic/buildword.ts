import { shuffle } from '../../../lib/random'
import type { SpeechLang } from '../../../i18n/types'
import type { Word } from '../../../content/types'
import { makeRound, type Level } from './rounds'
import { syllablesOf } from './syllables'

/** Syllables of the word by level: 2, 3, 4 or more. */
export const BUILD_RANGE: Record<Level, [min: number, max: number]> = { 1: [2, 2], 2: [3, 3], 3: [4, 6] }

export interface Bead {
  /** Position in the shuffled tray (a React key; equal syllables stay distinct). */
  id: number
  text: string
}

export interface BuildItem {
  word: Word
  /** Syllables in the right order. */
  syllables: string[]
  /** Shuffled tray; never equal to the right order when the word has two different syllables. */
  beads: Bead[]
}

/** Picturable words with a curated syllable split that fits the level (a short level-3 pool widens down to 3). */
export function buildWords(words: readonly Word[], level: Level, lang: SpeechLang, min = 5): Word[] {
  const ok = (w: Word) => (w.fitz === 'thing' || w.fitz === 'people') && w.topic !== 'core' && !!w.syllables
  const inRange = (w: Word, lo: number, hi: number) => {
    const n = syllablesOf(w, lang).length
    return n >= lo && n <= hi
  }
  const [lo, hi] = BUILD_RANGE[level]
  let pool = words.filter((w) => ok(w) && inRange(w, lo, hi))
  if (pool.length < min && level > 1) pool = words.filter((w) => ok(w) && inRange(w, lo - 1, hi))
  return pool
}

export function makeBuildRound(words: readonly Word[], level: Level, lang: SpeechLang, rand: () => number = Math.random, previous?: string, size = 5): BuildItem[] {
  const pool = buildWords(words, level, lang)
  return makeRound(pool, { options: 1, rand, previous, size }).map(({ target }) => {
    const syllables = syllablesOf(target, lang)
    let tray = shuffle(syllables, rand)
    for (let i = 0; i < 8 && tray.join('|') === syllables.join('|') && new Set(syllables).size > 1; i++) tray = shuffle(syllables, rand)
    return { word: target, syllables, beads: tray.map((text, id) => ({ id, text })) }
  })
}

/** True when `text` is the syllable expected at position `placed`. Equal syllables are interchangeable. */
export function isNextSyllable(item: BuildItem, placed: number, text: string): boolean {
  return item.syllables[placed] === text
}

/** The tray bead to glow as a hint: the first unused bead holding the expected syllable. */
export function hintBead(item: BuildItem, used: ReadonlySet<number>, placed: number): number | undefined {
  const want = item.syllables[placed]
  return item.beads.find((b) => !used.has(b.id) && b.text === want)?.id
}
