import { describe, expect, it } from 'vitest'
import { PHRASES } from '../content/phrases'
import { topicsForKind } from '../content/topics'
import { ADULT_TITLES } from './adultTitles'
import { FEATURES, featureAllowed, featureTitle } from './features'
import { quickPhrases, QUICK_COUNT } from './HomeAdult'

describe('adult quick phrases', () => {
  it('are eight, adult or shared, never the pain scale, never duplicated', () => {
    const list = quickPhrases()
    expect(list).toHaveLength(QUICK_COUNT)
    expect(new Set(list.map((p) => p.id)).size).toBe(QUICK_COUNT)
    for (const p of list) {
      expect(['adult', 'both']).toContain(p.audience)
      expect(p.id).not.toMatch(/^pain_/)
    }
  })

  it('fill up from other adult phrases when a curated id is missing', () => {
    const without = PHRASES.filter((p) => p.id !== 'thank_you')
    const list = quickPhrases(without)
    expect(list).toHaveLength(QUICK_COUNT)
    expect(list.some((p) => p.id === 'thank_you')).toBe(false)
  })
})

describe('screens per mode', () => {
  it('tokens and stories are for children only; everything else is open to both', () => {
    for (const f of Object.values(FEATURES)) {
      const childOnly = f.id === 'tokens' || f.id === 'stories'
      expect(featureAllowed(f, 'child')).toBe(true)
      expect(featureAllowed(f, 'adult')).toBe(!childOnly)
    }
  })

  it('adult navigation names', () => {
    expect(featureTitle(FEATURES.games, 'adult')).toEqual(ADULT_TITLES.games)
    expect(ADULT_TITLES.games).toEqual({ uz: 'Mashq', ru: 'Тренировка' })
    expect(ADULT_TITLES.schedule).toEqual({ uz: 'Reja', ru: 'План' })
    expect(ADULT_TITLES.exercises).toEqual({ uz: 'Ovoz', ru: 'Голос' })
    expect(featureTitle(FEATURES.games, 'child')).toEqual(FEATURES.games.title)
  })

  it('adult topics start with the core and never include child-only topics', () => {
    const adult = topicsForKind('adult')
    expect(adult[0].id).toBe('core')
    expect(adult.every((t) => t.audience !== 'child')).toBe(true)
  })
})
