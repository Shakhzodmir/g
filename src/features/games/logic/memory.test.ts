import { describe, expect, it } from 'vitest'
import { seeded } from '../../../lib/random'
import { createMemory, flip, matchedPairs, MEMORY_GRID, memoryPairs, settle, type MemState } from './memory'

function indexesOf(s: MemState, pairId: string): number[] {
  return s.cards.flatMap((c, i) => (c.pairId === pairId ? [i] : []))
}

describe('memory board', () => {
  it('has the board sizes 2×2, 3×2, 4×3', () => {
    expect(MEMORY_GRID[1]).toEqual({ cols: 2, rows: 2 })
    expect(MEMORY_GRID[2]).toEqual({ cols: 3, rows: 2 })
    expect(MEMORY_GRID[3]).toEqual({ cols: 4, rows: 3 })
    expect([memoryPairs(1), memoryPairs(2), memoryPairs(3)]).toEqual([2, 3, 6])
  })

  it('deals two cards per pair, face down, deterministically', () => {
    const a = createMemory(['cat', 'dog', 'cow'], seeded(5))
    expect(a.cards).toHaveLength(6)
    expect(a.cards.every((c) => !c.faceUp && !c.matched)).toBe(true)
    expect(indexesOf(a, 'cat')).toHaveLength(2)
    expect(createMemory(['cat', 'dog', 'cow'], seeded(5))).toEqual(a)
    expect(new Set(a.cards.map((c) => c.uid)).size).toBe(6)
  })
})

describe('flip', () => {
  it('opens one card, then matches its pair', () => {
    let s = createMemory(['cat', 'dog'], seeded(1))
    const [c1, c2] = indexesOf(s, 'cat')
    s = flip(s, c1)
    expect(s.phase).toBe('one')
    expect(s.cards[c1].faceUp).toBe(true)
    s = flip(s, c2)
    expect(s.phase).toBe('match')
    expect(s.cards[c1].matched && s.cards[c2].matched).toBe(true)
    expect(s.tries).toBe(1)
    expect(matchedPairs(s)).toBe(1)
    s = settle(s)
    expect(s.phase).toBe('ready')
    expect(s.cards[c1].faceUp).toBe(true)
  })

  it('a miss turns both cards back on settle', () => {
    let s = createMemory(['cat', 'dog'], seeded(2))
    const cat = indexesOf(s, 'cat')[0]
    const dog = indexesOf(s, 'dog')[0]
    s = flip(flip(s, cat), dog)
    expect(s.phase).toBe('miss')
    expect(s.open).toEqual([cat, dog])
    s = settle(s)
    expect(s.phase).toBe('ready')
    expect(s.cards[cat].faceUp || s.cards[dog].faceUp).toBe(false)
  })

  it('a new tap after a miss settles first and starts a new try', () => {
    let s = createMemory(['cat', 'dog'], seeded(3))
    const [cat1, cat2] = indexesOf(s, 'cat')
    const dog = indexesOf(s, 'dog')[0]
    s = flip(flip(s, cat1), dog)
    s = flip(s, cat2)
    expect(s.phase).toBe('one')
    expect(s.open).toEqual([cat2])
    expect(s.cards[cat1].faceUp).toBe(false)
  })

  it('ignores taps on open or matched cards', () => {
    let s = createMemory(['cat', 'dog'], seeded(4))
    const [c1, c2] = indexesOf(s, 'cat')
    s = flip(s, c1)
    expect(flip(s, c1)).toBe(s)
    s = settle(flip(s, c2))
    expect(flip(s, c1)).toBe(s)
    expect(flip(s, 99)).toBe(s)
  })

  it('finishes when every pair is found', () => {
    let s = createMemory(['cat', 'dog', 'cow'], seeded(9))
    for (const id of ['cat', 'dog', 'cow']) {
      const [a, b] = indexesOf(s, id)
      s = flip(flip(s, a), b)
    }
    expect(s.phase).toBe('done')
    expect(matchedPairs(s)).toBe(3)
    expect(flip(s, 0)).toBe(s)
  })
})
