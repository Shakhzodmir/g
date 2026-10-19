import { describe, expect, it } from 'vitest'
import {
  addItem,
  allDone,
  currentIndex,
  freshForToday,
  itemsFrom,
  markCurrentDone,
  moveItem,
  normalizeFirstThen,
  removeItem,
  replaceItem,
  resetDone,
  scheduleRowId,
  setDone,
} from './logic'
import { resolveCard, scheduleActivityRefs } from './cards'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'

describe('schedule logic', () => {
  const base = itemsFrom(['a', 'b', 'c'])

  it('finds the current item and marks it done in order', () => {
    expect(currentIndex(base)).toBe(0)
    const one = markCurrentDone(base)
    expect(one.map((i) => i.done)).toEqual([true, false, false])
    expect(currentIndex(one)).toBe(1)
    const all = markCurrentDone(markCurrentDone(one))
    expect(allDone(all)).toBe(true)
    expect(currentIndex(all)).toBe(-1)
    expect(markCurrentDone(all)).toBe(all)
    expect(base.every((i) => !i.done)).toBe(true) // immutable
  })

  it('an empty list is never "all done"', () => {
    expect(allDone([])).toBe(false)
  })

  it('moves items up and down and ignores out-of-range moves', () => {
    expect(moveItem(base, 0, 1).map((i) => i.ref)).toEqual(['b', 'a', 'c'])
    expect(moveItem(base, 2, -1).map((i) => i.ref)).toEqual(['a', 'c', 'b'])
    expect(moveItem(base, 0, -1)).toBe(base)
    expect(moveItem(base, 2, 1)).toBe(base)
  })

  it('adds, removes, replaces and resets', () => {
    expect(addItem(base, 'd').map((i) => i.ref)).toEqual(['a', 'b', 'c', 'd'])
    expect(removeItem(base, 1).map((i) => i.ref)).toEqual(['a', 'c'])
    expect(removeItem(base, 9)).toBe(base)
    const replaced = replaceItem(setDone(base, 1), 1, 'x')
    expect(replaced[1]).toEqual({ ref: 'x', done: false })
    expect(resetDone(setDone(setDone(base, 0), 2)).some((i) => i.done)).toBe(false)
  })

  it('clears done marks from an earlier calendar day only', () => {
    const yesterday = new Date(2026, 9, 18, 20, 0).getTime()
    const today = new Date(2026, 9, 19, 8, 0).getTime()
    const row = { items: setDone(base, 0), updatedAt: yesterday }
    expect(freshForToday(row, today).items.some((i) => i.done)).toBe(false)
    const sameDay = { items: setDone(base, 0), updatedAt: new Date(2026, 9, 19, 7, 0).getTime() }
    expect(freshForToday(sameDay, today)).toBe(sameDay)
  })

  it('first → then always has two slots', () => {
    expect(normalizeFirstThen([])).toHaveLength(2)
    expect(normalizeFirstThen(itemsFrom(['x', 'y', 'z'])).map((i) => i.ref)).toEqual(['x', 'y'])
    expect(scheduleRowId('p1', 'day')).toBe('p1:day')
  })
})

describe('card refs', () => {
  it('resolves words, stickers and unknown refs', () => {
    expect(resolveCard('breakfast')?.speech.key).toBe('w.breakfast')
    expect(resolveCard('st.anor')?.symbol).toBe('anor')
    expect(resolveCard('c.missing')).toBeNull()
    expect(resolveCard('no_such_word')).toBeNull()
  })

  it('every template item is a known word and offered as a schedule activity', () => {
    const acts = new Set(scheduleActivityRefs())
    for (const t of SCHEDULE_TEMPLATES) for (const id of t.items) expect(acts.has(id), id).toBe(true)
  })
})
