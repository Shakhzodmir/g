import { afterEach, describe, expect, it } from 'vitest'
import { paginate } from './Print'
import { IDLE_LOCK_MS, inParentTree, isParentUnlocked, lockParent, markParentUnlocked, touchParent, trustedEntry } from './unlock'

describe('paginate', () => {
  it('splits into A4 pages of 12', () => {
    const pages = paginate(Array.from({ length: 30 }, (_, i) => i))
    expect(pages.map((p) => p.length)).toEqual([12, 12, 6])
    expect(paginate([])).toEqual([])
  })
})

describe('parent unlock', () => {
  const T0 = 1_000_000
  const direct = { search: '' }
  afterEach(() => lockParent())

  it('is locked by default and asks for the gate on a direct open', () => {
    lockParent()
    expect(isParentUnlocked(T0)).toBe(false)
    expect(trustedEntry(direct, false, T0)).toBe(false)
  })

  it('does not trust history entries or location state (Back / typed URLs go through the gate)', () => {
    lockParent()
    // The old implementation trusted any history key other than "default" and `state.parentUnlocked`.
    const loc = { key: 'abc123', state: { parentUnlocked: true }, search: '' }
    expect(trustedEntry(loc, false, T0)).toBe(false)
  })

  it('unlocks after the gate and is re-locked by lockParent (leaving /parent or the close button)', () => {
    markParentUnlocked(T0)
    expect(isParentUnlocked(T0 + 1000)).toBe(true)
    expect(trustedEntry(direct, false, T0 + 1000)).toBe(true)
    lockParent()
    expect(isParentUnlocked(T0 + 1000)).toBe(false)
    expect(trustedEntry(direct, false, T0 + 1000)).toBe(false)
  })

  it('locks again after 10 minutes without interaction', () => {
    markParentUnlocked(T0)
    expect(isParentUnlocked(T0 + IDLE_LOCK_MS)).toBe(true)
    expect(isParentUnlocked(T0 + IDLE_LOCK_MS + 1)).toBe(false)
    // once expired it stays locked, even if time seems to go back or activity arrives late
    touchParent(T0 + IDLE_LOCK_MS + 2)
    expect(isParentUnlocked(T0 + IDLE_LOCK_MS + 3)).toBe(false)
  })

  it('interaction keeps the area open', () => {
    markParentUnlocked(T0)
    touchParent(T0 + IDLE_LOCK_MS - 1000)
    expect(isParentUnlocked(T0 + IDLE_LOCK_MS + 5000)).toBe(true)
    expect(isParentUnlocked(T0 + 2 * IDLE_LOCK_MS)).toBe(false)
  })

  it('activity can never unlock a locked area', () => {
    lockParent()
    touchParent(T0)
    expect(isParentUnlocked(T0)).toBe(false)
  })

  it('accepts ?qa only in development', () => {
    lockParent()
    expect(trustedEntry({ search: '?qa' }, true, T0)).toBe(true)
    expect(trustedEntry({ search: '?qa' }, false, T0)).toBe(false)
  })

  it('knows which routes belong to the adult tree', () => {
    expect(inParentTree('/parent')).toBe(true)
    expect(inParentTree('/parent/settings')).toBe(true)
    expect(inParentTree('/')).toBe(false)
    expect(inParentTree('/parental')).toBe(false)
    expect(inParentTree('/talk')).toBe(false)
  })
})
