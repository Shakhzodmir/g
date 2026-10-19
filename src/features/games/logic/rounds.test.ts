import { describe, expect, it } from 'vitest'
import { seeded } from '../../../lib/random'
import { LEVELS, makeRound, optionCount, pickSticker, ROUND_SIZE } from './rounds'

const POOL = ['apple', 'banana', 'grapes', 'melon', 'peach', 'carrot', 'tomato', 'egg']

describe('makeRound', () => {
  it('always includes the correct answer exactly once', () => {
    for (let seed = 1; seed < 60; seed++) {
      for (const n of [2, 3, 4, 6]) {
        const round = makeRound(POOL, { options: n, rand: seeded(seed) })
        for (const item of round) expect(item.options.filter((o) => o === item.target)).toHaveLength(1)
      }
    }
  })

  it('has ROUND_SIZE items and the option count of the level', () => {
    for (const level of LEVELS) {
      const round = makeRound(POOL, { options: optionCount('find', level), rand: seeded(level) })
      expect(round).toHaveLength(ROUND_SIZE)
      for (const item of round) expect(item.options).toHaveLength(optionCount('find', level))
    }
    expect(optionCount('find', 1)).toBe(2)
    expect(optionCount('find', 2)).toBe(4)
    expect(optionCount('find', 3)).toBe(6)
    expect(optionCount('animals', 1)).toBe(2)
    expect(optionCount('animals', 2)).toBe(3)
    expect(optionCount('animals', 3)).toBe(4)
  })

  it('options are distinct', () => {
    const round = makeRound(POOL, { options: 6, rand: seeded(7) })
    for (const item of round) expect(new Set(item.options).size).toBe(item.options.length)
  })

  it('never repeats a target twice in a row, even with a tiny pool', () => {
    for (let seed = 1; seed < 100; seed++) {
      const round = makeRound(['a', 'b', 'c'], { options: 2, rand: seeded(seed), size: 12 })
      for (let i = 1; i < round.length; i++) expect(round[i].target).not.toBe(round[i - 1].target)
    }
  })

  it('uses different targets when the pool is big enough', () => {
    for (let seed = 1; seed < 40; seed++) {
      const round = makeRound(POOL, { options: 2, rand: seeded(seed) })
      expect(new Set(round.map((r) => r.target)).size).toBe(ROUND_SIZE)
    }
  })

  it('does not start a new round with the previous round’s last picture', () => {
    for (let seed = 1; seed < 80; seed++) {
      expect(makeRound(POOL, { options: 2, rand: seeded(seed), previous: 'apple' })[0].target).not.toBe('apple')
      expect(makeRound(['apple', 'egg', 'peach'], { options: 2, rand: seeded(seed), previous: 'apple' })[0].target).not.toBe('apple')
    }
  })

  it('is deterministic with a seeded RNG', () => {
    const a = makeRound(POOL, { options: 4, rand: seeded(42) })
    const b = makeRound(POOL, { options: 4, rand: seeded(42) })
    const c = makeRound(POOL, { options: 4, rand: seeded(43) })
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('clamps the option count to the pool and works with objects', () => {
    const pool = [{ id: 'x' }, { id: 'y' }]
    const round = makeRound(pool, { options: 6, rand: seeded(3) })
    expect(round[0].options).toHaveLength(2)
    expect(makeRound([], { options: 2 })).toEqual([])
    const single = makeRound([{ id: 'only' }], { options: 3, size: 2, rand: seeded(1) })
    expect(single.map((r) => r.target.id)).toEqual(['only', 'only'])
  })
})

describe('pickSticker', () => {
  const S = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('prefers stickers the child does not have yet', () => {
    for (let seed = 1; seed < 30; seed++) expect(pickSticker(S, new Set(['a', 'b']), seeded(seed)).id).toBe('c')
  })
  it('falls back to any sticker when the album is full', () => {
    expect(S.map((s) => s.id)).toContain(pickSticker(S, new Set(['a', 'b', 'c']), seeded(1)).id)
  })
})
