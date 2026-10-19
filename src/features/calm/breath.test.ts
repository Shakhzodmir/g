import { describe, expect, it } from 'vitest'
import { breathAt, easeInOutSine, EXHALE_MS, INHALE_MS, MAX_SCALE, MIN_SCALE } from './breath'

describe('breathAt', () => {
  it('starts an inhale from the smallest size', () => {
    const s = breathAt(0)
    expect(s.phase).toBe('in')
    expect(s.cycle).toBe(0)
    expect(s.scale).toBeCloseTo(MIN_SCALE)
  })

  it('is full at the end of the 4 s inhale and switches to exhale', () => {
    expect(breathAt(INHALE_MS - 1).phase).toBe('in')
    const s = breathAt(INHALE_MS)
    expect(s.phase).toBe('out')
    expect(s.scale).toBeCloseTo(MAX_SCALE)
  })

  it('is half way at the middle of each phase', () => {
    const mid = (MIN_SCALE + MAX_SCALE) / 2
    expect(breathAt(INHALE_MS / 2).scale).toBeCloseTo(mid)
    expect(breathAt(INHALE_MS + EXHALE_MS / 2).scale).toBeCloseTo(mid)
  })

  it('repeats every 10 s and counts cycles', () => {
    const p = INHALE_MS + EXHALE_MS
    expect(breathAt(p).phase).toBe('in')
    expect(breathAt(p).cycle).toBe(1)
    expect(breathAt(3 * p + 1000).scale).toBeCloseTo(breathAt(1000).scale)
  })

  it('never leaves the size range (no bounce) and treats bad input as the start', () => {
    for (let t = 0; t < 20000; t += 97) {
      const { scale, progress } = breathAt(t)
      expect(scale).toBeGreaterThanOrEqual(MIN_SCALE - 1e-9)
      expect(scale).toBeLessThanOrEqual(MAX_SCALE + 1e-9)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThan(1)
    }
    expect(breathAt(-500)).toEqual(breathAt(0))
    expect(breathAt(Number.NaN)).toEqual(breathAt(0))
  })

  it('eases monotonically', () => {
    let prev = -1
    for (let p = 0; p <= 1; p += 0.05) {
      const v = easeInOutSine(p)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    expect(easeInOutSine(0)).toBe(0)
    expect(easeInOutSine(1)).toBe(1)
  })
})
