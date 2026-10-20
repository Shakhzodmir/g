import { sample, shuffle } from '../../../lib/random'

export type Level = 1 | 2 | 3
export type AdultGameId = 'naming' | 'sentence' | 'category' | 'wordpic' | 'oddone' | 'listen' | 'situations'
export type KidGameId = 'colors' | 'count' | 'shapes' | 'odd' | 'routine' | 'sound' | 'build' | 'opposite' | 'point'
export type GameId = 'animals' | 'find' | 'memory' | 'syllables' | AdultGameId | KidGameId

/** Items per round: short and predictable. */
export const ROUND_SIZE = 5
/** Items per round for adult profiles (8 is the usual length of a short training set). */
export const ADULT_ROUND_SIZE = 8
/** After this many rounds in a row the game suggests a rest (never forces it). */
export const REST_AFTER_ROUNDS = 3
/** Errorless learning: the correct card glows softly after this delay. */
export const HINT_DELAY_MS = 4000

export const LEVELS: Level[] = [1, 2, 3]

/** Number of pictures to choose from, by game and level. */
export const OPTION_COUNTS: Record<'animals' | 'find', Record<Level, number>> = {
  animals: { 1: 2, 2: 3, 3: 4 },
  find: { 1: 2, 2: 4, 3: 6 },
}

export function optionCount(game: 'animals' | 'find', level: Level): number {
  return OPTION_COUNTS[game][level]
}

export function isLevel(v: unknown): v is Level {
  return v === 1 || v === 2 || v === 3
}

export interface RoundItem<T> {
  target: T
  /** Shuffled options; always contains `target` exactly once. */
  options: T[]
}

export interface RoundOptions<T> {
  /** Options per item (clamped to the pool size, at least 1). */
  options: number
  /** Items in the round (default ROUND_SIZE). */
  size?: number
  rand?: () => number
  /** Identity of an item (default: the item itself when it is a string, else its `id`). */
  key?: (item: T) => string
  /** Key of the last target of the previous round, so a new round never starts with the same picture. */
  previous?: string
}

function defaultKey<T>(item: T): string {
  if (typeof item === 'string') return item
  return String((item as { id?: unknown }).id)
}

/**
 * Builds one round: `size` targets with no target repeated twice in a row (and no repeats at all when
 * the pool is big enough), each with `options` choices that include the target. Deterministic for a
 * seeded `rand`.
 */
export function makeRound<T>(pool: readonly T[], opts: RoundOptions<T>): RoundItem<T>[] {
  const rand = opts.rand ?? Math.random
  const key = opts.key ?? defaultKey
  const size = opts.size ?? ROUND_SIZE
  if (pool.length === 0 || size <= 0) return []
  const n = Math.max(1, Math.min(opts.options, pool.length))

  const targets: T[] = []
  if (pool.length >= size + (opts.previous !== undefined ? 1 : 0)) {
    // Enough pictures: all targets are different, and none equals the previous round's last one.
    const candidates = pool.filter((p) => key(p) !== opts.previous)
    targets.push(...sample(candidates, size, rand))
  } else {
    let prev = opts.previous
    for (let i = 0; i < size; i++) {
      const candidates = pool.length > 1 ? pool.filter((p) => key(p) !== prev) : pool.slice()
      // Prefer pictures not used yet in this round.
      const fresh = candidates.filter((c) => !targets.some((t) => key(t) === key(c)))
      const from = fresh.length ? fresh : candidates
      const pick = from[Math.floor(rand() * from.length)]
      targets.push(pick)
      prev = key(pick)
    }
  }

  return targets.map((target) => {
    const others = pool.filter((p) => key(p) !== key(target))
    const options = shuffle([target, ...sample(others, n - 1, rand)], rand)
    return { target, options }
  })
}

/** Prefers a sticker the child does not have yet, so the album keeps growing. */
export function pickSticker<T extends { id: string }>(stickers: readonly T[], owned: ReadonlySet<string>, rand: () => number = Math.random): T {
  const fresh = stickers.filter((s) => !owned.has(s.id))
  const from = fresh.length ? fresh : stickers
  return from[Math.floor(rand() * from.length)]
}
