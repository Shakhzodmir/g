import { describe, expect, it } from 'vitest'
import { paginate } from './Print'
import { lockParent, markParentUnlocked, trustedEntry } from './unlock'

describe('paginate', () => {
  it('splits into A4 pages of 12', () => {
    const pages = paginate(Array.from({ length: 30 }, (_, i) => i))
    expect(pages.map((p) => p.length)).toEqual([12, 12, 6])
    expect(paginate([])).toEqual([])
  })
})

describe('parent unlock', () => {
  const direct = { key: 'default', state: null, search: '' }
  it('asks for the gate on a direct open', () => {
    lockParent()
    expect(trustedEntry(direct, false)).toBe(false)
  })
  it('trusts in-app navigation, explicit state and an earlier unlock', () => {
    lockParent()
    expect(trustedEntry({ ...direct, key: 'abc123' }, false)).toBe(true)
    expect(trustedEntry({ ...direct, state: { parentUnlocked: true } }, false)).toBe(true)
    markParentUnlocked()
    expect(trustedEntry(direct, false)).toBe(true)
    lockParent()
  })
  it('accepts ?qa only in development', () => {
    lockParent()
    expect(trustedEntry({ ...direct, search: '?qa' }, true)).toBe(true)
    expect(trustedEntry({ ...direct, search: '?qa' }, false)).toBe(false)
  })
})
