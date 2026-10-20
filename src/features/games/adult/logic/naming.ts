import { adultItems, frameIdOf, hasSpokenCue, itemSyllables, type GItem } from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { uzCyrlToLatn } from '../../../../i18n/orthography'
import { ADULT_ROUND, foldText, shuffle, type Lang, type Rand } from './common'

/*
 * Naming with a cue ladder (the standard word-finding approach): the person tries to name the picture and may ask for
 * help in a fixed order. 0 = no cue, 1 = first syllable / sound shown, 2 = first syllable spoken, 3 = sentence to
 * complete, 4 = the word itself is spoken. Cues the item does not have are skipped.
 */
export type CueLevel = 0 | 1 | 2 | 3 | 4

/** Cue levels an item offers, in order. */
export function cuesFor(item: GItem): CueLevel[] {
  const out: CueLevel[] = [1]
  if (hasSpokenCue(item)) out.push(2)
  if (frameIdOf(item)) out.push(3)
  out.push(4)
  return out
}

/** The next cue after `current` (0 = none given yet), or null when the ladder is used up. */
export function nextCue(item: GItem, current: CueLevel): CueLevel | null {
  return cuesFor(item).find((c) => c > current) ?? null
}

/** Difficulty by length: level 1 = one or two syllables, level 2 = two or three, level 3 = three or more. */
export const NAMING_SYLLABLES: Record<Level, [min: number, max: number]> = { 1: [1, 2], 2: [2, 3], 3: [3, 9] }

export function namingPool(level: Level, lang: Lang, items: readonly GItem[] = adultItems()): GItem[] {
  const [min, max] = NAMING_SYLLABLES[level]
  const fits = items.filter((i) => {
    const n = itemSyllables(i, lang).length
    return n >= min && n <= max
  })
  // Never leave a level with too few pictures (new vocabulary may be sparse): widen to everything.
  return fits.length >= ADULT_ROUND * 2 ? fits : items.slice()
}

/** One round of naming targets: all different pictures, none equal to `previous`. */
export function namingRound(level: Level, lang: Lang, rand: Rand = Math.random, size = ADULT_ROUND, previous?: string, items?: readonly GItem[]): GItem[] {
  const pool = namingPool(level, lang, items).filter((i) => i.id !== previous)
  const picked: GItem[] = []
  const symbols = new Set<string>()
  for (const it of shuffle(pool, rand)) {
    if (picked.length >= size) break
    if (symbols.has(it.symbol)) continue
    symbols.add(it.symbol)
    picked.push(it)
  }
  return picked
}

export interface NamingResult {
  item: string
  /** Highest cue used before the word came out (0 = named without any cue). */
  cue: CueLevel
  ok: boolean
  mode: 'said' | 'typed'
}

export interface NamingSummary {
  total: number
  /** Named with no cue at all. */
  unaided: number
  /** Named after a cue: count by cue level. */
  cued: Record<1 | 2 | 3 | 4, number>
  skipped: number
}

export function summarizeNaming(results: readonly NamingResult[]): NamingSummary {
  const s: NamingSummary = { total: results.length, unaided: 0, cued: { 1: 0, 2: 0, 3: 0, 4: 0 }, skipped: 0 }
  for (const r of results) {
    if (!r.ok) s.skipped++
    else if (r.cue === 0) s.unaided++
    else s.cued[r.cue]++
  }
  return s
}

/** Does a typed answer match the picture's name (either language, any script, apostrophes and case ignored)? */
export function matchesTyped(input: string, item: Pick<GItem, 'uz' | 'ru'>): boolean {
  const f = foldText(input)
  if (!f) return false
  // Cyrillic input is either Russian or Uzbek Cyrillic: try it as Russian first, then transliterated to Latin.
  const asLatin = /[Ѐ-ӿ]/.test(input) ? foldText(uzCyrlToLatn(input)) : f
  return f === foldText(item.ru) || f === foldText(item.uz) || asLatin === foldText(item.uz)
}
