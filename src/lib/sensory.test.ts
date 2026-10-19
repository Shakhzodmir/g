import { describe, expect, it } from 'vitest'
import { effectiveSensory } from './sensory'

describe('effectiveSensory', () => {
  it('keeps the profile level normally', () => {
    expect(effectiveSensory('festive', false)).toBe('festive')
    expect(effectiveSensory('normal', false)).toBe('normal')
  })
  it('prefers-reduced-motion forces calm', () => {
    expect(effectiveSensory('festive', true)).toBe('calm')
    expect(effectiveSensory('normal', true)).toBe('calm')
  })
})
