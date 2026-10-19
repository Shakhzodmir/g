import { shuffle } from '../../../lib/random'
import type { Level } from './rounds'

/** Board size by level: 2×2, 3×2, 4×3. */
export const MEMORY_GRID: Record<Level, { cols: number; rows: number }> = {
  1: { cols: 2, rows: 2 },
  2: { cols: 3, rows: 2 },
  3: { cols: 4, rows: 3 },
}

export function memoryPairs(level: Level): number {
  const g = MEMORY_GRID[level]
  return (g.cols * g.rows) / 2
}

export interface MemCard {
  /** Position-independent identity of the card (stable React key). */
  uid: number
  /** Both cards of a pair share it (a word id). */
  pairId: string
  faceUp: boolean
  matched: boolean
}

/**
 * - `ready`: waiting for the first card of a try;
 * - `one`:   one card is open;
 * - `match`: two open cards are a pair (already marked matched; `settle` just clears them);
 * - `miss`:  two open cards differ (`settle` turns them back; a new flip settles first);
 * - `done`:  every pair is found.
 */
export type MemPhase = 'ready' | 'one' | 'match' | 'miss' | 'done'

export interface MemState {
  cards: MemCard[]
  /** Indexes of the cards opened in the current try (0–2). */
  open: number[]
  phase: MemPhase
  /** Tries made (two cards = one try). Shown only to adults, never as a score. */
  tries: number
}

export function createMemory(pairIds: readonly string[], rand: () => number = Math.random): MemState {
  const deck = pairIds.flatMap((pairId, i) => [
    { uid: i * 2, pairId, faceUp: false, matched: false },
    { uid: i * 2 + 1, pairId, faceUp: false, matched: false },
  ])
  return { cards: shuffle(deck, rand), open: [], phase: pairIds.length ? 'ready' : 'done', tries: 0 }
}

/** Closes a finished try: a missed pair turns face down again, a matched one stays up. */
export function settle(s: MemState): MemState {
  if (s.phase === 'miss') {
    const cards = s.cards.map((c, i) => (s.open.includes(i) ? { ...c, faceUp: false } : c))
    return { ...s, cards, open: [], phase: 'ready' }
  }
  if (s.phase === 'match') return { ...s, open: [], phase: 'ready' }
  return s
}

/** Turns one card over. Taps on open or matched cards are ignored, so nothing can go "wrong". */
export function flip(state: MemState, index: number): MemState {
  let s = state
  if (s.phase === 'done') return s
  if (s.phase === 'miss' || s.phase === 'match') s = settle(s)
  const card = s.cards[index]
  if (!card || card.faceUp || card.matched) return s

  const cards = s.cards.slice()
  cards[index] = { ...card, faceUp: true }
  if (s.open.length === 0) return { ...s, cards, open: [index], phase: 'one' }

  const first = s.open[0]
  const tries = s.tries + 1
  if (cards[first].pairId === card.pairId) {
    cards[first] = { ...cards[first], matched: true }
    cards[index] = { ...cards[index], matched: true }
    const done = cards.every((c) => c.matched)
    return { cards, open: done ? [] : [first, index], phase: done ? 'done' : 'match', tries }
  }
  return { cards, open: [first, index], phase: 'miss', tries }
}

export function matchedPairs(s: MemState): number {
  return s.cards.filter((c) => c.matched).length / 2
}
