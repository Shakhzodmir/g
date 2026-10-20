import { adultItems, type GItem } from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, pickDistinct, shuffle, similarity, type Lang, type Rand } from './common'

/** Choices per item for the word-picture game. */
export const WORDPIC_OPTIONS: Record<Level, number> = { 1: 3, 2: 4, 3: 6 }

export type MatchDirection = 'word-to-picture' | 'picture-to-word'

export interface MatchItem {
  target: GItem
  options: GItem[]
}

/**
 * Distractors by level: 1 = unrelated things, 2 = things of the same category (semantic), 3 = the most similar names
 * (shared beginning/ending, same length, same category: phonological and orthographic neighbours).
 */
export function matchDistractors(target: GItem, level: Level, lang: Lang, rand: Rand, pool: readonly GItem[] = adultItems()): GItem[] {
  const n = WORDPIC_OPTIONS[level] - 1
  const others = pool.filter((i) => i.id !== target.id)
  if (level === 1) {
    const far = others.filter((i) => !i.cats.some((c) => target.cats.includes(c)))
    return pickDistinct(shuffle(far.length >= n ? far : others, rand), n, [target])
  }
  if (level === 2) {
    const same = others.filter((i) => i.cats.some((c) => target.cats.includes(c)))
    const picked = pickDistinct(shuffle(same, rand), n, [target])
    // A small category: fill up with the most similar names.
    if (picked.length < n) {
      const rest = others.filter((i) => !picked.includes(i)).sort((a, b) => similarity(target, b, lang) - similarity(target, a, lang))
      picked.push(...pickDistinct(rest, n - picked.length, [target, ...picked]))
    }
    return picked
  }
  const ranked = others.slice().sort((a, b) => similarity(target, b, lang) - similarity(target, a, lang))
  // The very best matches, in a random order, so a round does not always show the same neighbours.
  const top = shuffle(ranked.slice(0, Math.max(n * 3, 12)), rand)
  return pickDistinct(top, n, [target])
}

export function matchRound(level: Level, lang: Lang, rand: Rand = Math.random, size = ADULT_ROUND, previous?: string, pool: readonly GItem[] = adultItems()): MatchItem[] {
  const targets: GItem[] = []
  const symbols = new Set<string>()
  for (const it of shuffle(pool, rand)) {
    if (targets.length >= size) break
    if (it.id === previous || symbols.has(it.symbol)) continue
    symbols.add(it.symbol)
    targets.push(it)
  }
  return targets.map((target) => ({ target, options: shuffle([target, ...matchDistractors(target, level, lang, rand, pool)], rand) }))
}
