import { COUNT_OBJECTS } from '../../../content/gamedata'
import { sample, shuffle } from '../../../lib/random'
import { makeRound, type Level } from './rounds'

/** Largest number of a level: 1–3, 1–6, 1–10. */
export const COUNT_MAX: Record<Level, number> = { 1: 3, 2: 6, 3: 10 }
export const COUNT_OPTIONS: Record<Level, number> = { 1: 3, 2: 4, 3: 4 }

export interface CountItem {
  n: number
  /** The picture that is counted (all objects of an item are the same). */
  symbol: string
  /** Numerals to choose from, ascending (a calm, predictable order). Always contains `n` once. */
  options: number[]
}

export function makeCountRound(level: Level, rand: () => number = Math.random, previous?: number): CountItem[] {
  const max = COUNT_MAX[level]
  const pool = Array.from({ length: max }, (_, i) => i + 1)
  const targets = makeRound(pool, { options: 1, rand, previous: previous === undefined ? undefined : String(previous), key: (x) => String(x) })
  let lastSymbol = ''
  return targets.map(({ target }) => {
    // Numbers near the target are the fair distractors.
    const near = shuffle(pool.filter((p) => p !== target && Math.abs(p - target) <= 3), rand)
    const rest = shuffle(pool.filter((p) => p !== target && !near.includes(p)), rand)
    const others = [...near, ...rest].slice(0, Math.min(COUNT_OPTIONS[level], pool.length) - 1)
    const symbol = sample(COUNT_OBJECTS.filter((s) => s !== lastSymbol), 1, rand)[0]
    lastSymbol = symbol
    return { n: target, symbol, options: [target, ...others].sort((a, b) => a - b) }
  })
}

/** Counting by tapping: the number to say for the next tap, or null when all objects are counted. */
export function nextCount(counted: number, total: number): number | null {
  return counted >= total ? null : counted + 1
}
