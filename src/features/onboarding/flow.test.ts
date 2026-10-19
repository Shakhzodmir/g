import { describe, expect, it } from 'vitest'
import {
  allowedPosition,
  defaultAge,
  emptyDraft,
  nameValid,
  parseDraft,
  parsePosition,
  positionSearch,
  previousPosition,
  profileAge,
  rewindDepth,
} from './flow'

describe('onboarding step in the URL', () => {
  it('round-trips every position', () => {
    for (const p of [
      { step: 'lang', info: 0 },
      { step: 'who', info: 0 },
      { step: 'name', info: 0 },
      { step: 'info', info: 0 },
      { step: 'info', info: 2 },
    ] as const) {
      expect(parsePosition(positionSearch(p))).toEqual(p)
    }
  })

  it('falls back to the first step for junk', () => {
    expect(parsePosition('')).toEqual({ step: 'lang', info: 0 })
    expect(parsePosition('?step=nope')).toEqual({ step: 'lang', info: 0 })
    expect(parsePosition('?step=info&i=99')).toEqual({ step: 'info', info: 2 })
    expect(parsePosition('?step=info&i=-4')).toEqual({ step: 'info', info: 0 })
    expect(parsePosition('?step=name&i=2')).toEqual({ step: 'name', info: 0 })
  })

  it('walks back one place at a time', () => {
    expect(previousPosition({ step: 'lang', info: 0 })).toBeNull()
    expect(previousPosition({ step: 'who', info: 0 })).toEqual({ step: 'lang', info: 0 })
    expect(previousPosition({ step: 'name', info: 0 })).toEqual({ step: 'who', info: 0 })
    expect(previousPosition({ step: 'info', info: 0 })).toEqual({ step: 'name', info: 0 })
    expect(previousPosition({ step: 'info', info: 2 })).toEqual({ step: 'info', info: 1 })
  })
})

describe('onboarding guards', () => {
  it('a name is required before the info pages', () => {
    const d = emptyDraft()
    expect(allowedPosition({ step: 'info', info: 1 }, d)).toEqual({ step: 'name', info: 0 })
    expect(allowedPosition({ step: 'info', info: 1 }, { ...d, name: '  ' })).toEqual({ step: 'name', info: 0 })
    expect(allowedPosition({ step: 'info', info: 1 }, { ...d, name: 'Aziz' })).toEqual({ step: 'info', info: 1 })
    expect(allowedPosition({ step: 'who', info: 0 }, d)).toEqual({ step: 'who', info: 0 })
    expect(nameValid(' \n')).toBe(false)
    expect(nameValid(' A ')).toBe(true)
  })

  it('age group: asked for children (default 5-7), 13+ for adults', () => {
    expect(defaultAge('child')).toBe('5-7')
    expect(profileAge({ kind: 'child', name: 'A', ageGroup: '2-4' })).toBe('2-4')
    expect(profileAge({ kind: 'adult', name: 'A', ageGroup: '2-4' })).toBe('13+')
  })

  it('draft survives a reload and is sanitised', () => {
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft('{bad json')).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ kind: 'adult', name: 'Zuhra', ageGroup: 'x' }))).toEqual({ kind: 'adult', name: 'Zuhra', ageGroup: '13+' })
    expect(parseDraft(JSON.stringify({ kind: 'child', name: 'A'.repeat(50), ageGroup: '8-12' })).name).toHaveLength(30)
  })

  it('rewinds only the entries the wizard added', () => {
    expect(rewindDepth(5, 2)).toBe(3)
    expect(rewindDepth(2, 2)).toBe(0)
    expect(rewindDepth(1, 4)).toBe(0)
    expect(rewindDepth(undefined, 2)).toBe(0)
  })
})
