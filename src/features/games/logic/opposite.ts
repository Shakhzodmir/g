import { OPP_PAIRS, type OppPair, type OppVisual } from '../../../content/gamedata'
import { shuffle } from '../../../lib/random'
import type { Level } from './rounds'

/** Cards on the table: the opposite plus 1, 2 or 3 pictures from other pairs. */
export const OPP_OPTIONS: Record<Level, number> = { 1: 2, 2: 3, 3: 4 }

export interface OppOption {
  /** `<pair>.<a|b>` */
  id: string
  word: string
  visual: OppVisual
}

export interface OppItem {
  pair: OppPair
  /** The side that is shown and said; the child looks for the other one. */
  shown: OppOption
  correct: OppOption
  options: OppOption[]
  /** Level 3: the shown side is only said, not drawn. */
  hideShown: boolean
}

const sideA = (p: OppPair): OppOption => ({ id: `${p.id}.a`, word: p.a, visual: p.va })
const sideB = (p: OppPair): OppOption => ({ id: `${p.id}.b`, word: p.b, visual: p.vb })

export function oppPairs(level: Level, has: (wordId: string) => boolean): OppPair[] {
  return OPP_PAIRS.filter((p) => has(p.a) && has(p.b) && (level > 1 || p.easy))
}

export function makeOppRound(level: Level, has: (wordId: string) => boolean, rand: () => number = Math.random, size = 5, previous?: string): OppItem[] {
  const pairs = oppPairs(level, has)
  if (pairs.length < 2) return []
  const all = OPP_PAIRS.filter((p) => has(p.a) && has(p.b))
  let order = shuffle(pairs, rand)
  if (previous && order.length > 1 && order[0].id === previous) order = [...order.slice(1), order[0]]
  const n = OPP_OPTIONS[level]
  return Array.from({ length: size }, (_, i): OppItem => {
    const pair = order[i % order.length]
    const flip = rand() < 0.5
    const shown = flip ? sideB(pair) : sideA(pair)
    const correct = flip ? sideA(pair) : sideB(pair)
    const others = shuffle(all.filter((p) => p.id !== pair.id), rand)
      .slice(0, n - 1)
      .map((p) => (rand() < 0.5 ? sideA(p) : sideB(p)))
    return { pair, shown, correct, options: shuffle([correct, ...others], rand), hideShown: level === 3 }
  })
}
