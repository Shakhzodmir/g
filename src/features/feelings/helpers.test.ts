import { describe, expect, it } from 'vitest'
import { FEELINGS } from '../../content/feelings'
import { feelingById, helperById, helpersFor } from './helpers'

describe('feeling helpers', () => {
  it('resolves every feeling to at least one helper, keeping the order', () => {
    for (const f of FEELINGS) {
      const hs = helpersFor(f)
      expect(hs.length, f.id).toBeGreaterThan(0)
      expect(hs.map((h) => h.id)).toEqual(f.helps.filter((id) => helperById(id)))
    }
  })

  it('skips unknown helper ids', () => {
    const f = { ...FEELINGS[0], helps: ['nope', 'water'] }
    expect(helpersFor(f).map((h) => h.id)).toEqual(['water'])
  })

  it('finds feelings by id', () => {
    expect(feelingById('sad')?.id).toBe('sad')
    expect(feelingById('missing')).toBeUndefined()
    expect(feelingById(undefined)).toBeUndefined()
  })
})
