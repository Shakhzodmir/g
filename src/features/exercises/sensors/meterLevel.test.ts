import { describe, expect, it } from 'vitest'
import { clamp01, createMeterSmoother, levelFromRms, levelFromThreshold, METER_SILENCE, METER_STEPS, METER_STEPS_CALM, meterProfile, stepsToPercent, toSteps } from './meterLevel'

describe('clamp01', () => {
  it('keeps values inside 0..1 and treats garbage as silence', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(7)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0)
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('levelFromRms (silence floor and clamp)', () => {
  it('is exactly 0 at and below the silence floor', () => {
    expect(levelFromRms(0, 0.01, 0.1)).toBe(0)
    expect(levelFromRms(0.005, 0.01, 0.1)).toBe(0)
    expect(levelFromRms(0.01, 0.01, 0.1)).toBe(0)
  })
  it('rises with loudness on a log scale and is 1 at the top', () => {
    const quiet = levelFromRms(0.02, 0.01, 0.1)
    const mid = levelFromRms(0.04, 0.01, 0.1)
    expect(quiet).toBeGreaterThan(0)
    expect(mid).toBeGreaterThan(quiet)
    expect(levelFromRms(0.1, 0.01, 0.1)).toBeCloseTo(1, 6)
    // log scale: doubling adds the same amount at any loudness
    expect(levelFromRms(0.04, 0.01, 0.1) - levelFromRms(0.02, 0.01, 0.1)).toBeCloseTo(levelFromRms(0.08, 0.01, 0.1) - levelFromRms(0.04, 0.01, 0.1), 6)
  })
  it('never exceeds 1 for a shout and never returns NaN for broken settings', () => {
    expect(levelFromRms(5, 0.01, 0.1)).toBe(1)
    expect(levelFromRms(0.5, 0, 0.1)).toBe(0)
    expect(levelFromRms(0.5, 0.1, 0.1)).toBe(0)
    expect(levelFromRms(Number.NaN, 0.01, 0.1)).toBe(0)
  })
  it('the breath meter starts at half the threshold and is full at three times the threshold', () => {
    expect(levelFromThreshold(0.02, 0.05)).toBe(0)
    expect(levelFromThreshold(0.025, 0.05)).toBe(0)
    expect(levelFromThreshold(0.05, 0.05)).toBeGreaterThan(0.3)
    expect(levelFromThreshold(0.05, 0.05)).toBeLessThan(0.7)
    expect(levelFromThreshold(0.15, 0.05)).toBeCloseTo(1, 6)
    expect(levelFromThreshold(1, 0.05)).toBe(1)
  })
})

describe('createMeterSmoother', () => {
  it('rises faster than it falls (fast attack, slow release)', () => {
    const rise = createMeterSmoother()
    const fall = createMeterSmoother()
    const up = rise.update(1, 100)
    fall.update(1, 5000) // settle at the top
    const down = 1 - fall.update(0, 100)
    expect(up).toBeGreaterThan(0.5)
    expect(down).toBeLessThan(up)
  })
  it('stays inside 0..1 whatever it is fed', () => {
    const m = createMeterSmoother()
    for (const x of [5, -2, Number.NaN, 0.3, 1e9]) {
      const v = m.update(x, 33)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('ignores noise under the silence floor: the bar stays at exactly 0', () => {
    const m = createMeterSmoother()
    for (let i = 0; i < 60; i++) expect(m.update(METER_SILENCE * 0.9, 33)).toBe(0)
  })
  it('falls back to exactly 0 after the sound stops (no ghost segment)', () => {
    const m = createMeterSmoother()
    for (let i = 0; i < 20; i++) m.update(0.8, 33)
    expect(m.value).toBeGreaterThan(0.7)
    for (let i = 0; i < 300; i++) m.update(0, 33)
    expect(m.value).toBe(0)
  })
  it('a zero or negative time step changes nothing and never produces NaN', () => {
    const m = createMeterSmoother()
    m.update(0.6, 100)
    const before = m.value
    expect(m.update(0.6, 0)).toBe(before)
    expect(Number.isNaN(m.update(0.6, -5))).toBe(false)
    expect(Number.isNaN(m.update(0.6, Number.NaN))).toBe(false)
  })
  it('reset empties the bar', () => {
    const m = createMeterSmoother()
    m.update(1, 1000)
    m.reset()
    expect(m.value).toBe(0)
  })
})

describe('steps and percent', () => {
  it('lights nothing under the silence floor and at least one segment above it', () => {
    expect(toSteps(0)).toBe(0)
    expect(toSteps(METER_SILENCE * 0.5)).toBe(0)
    expect(toSteps(METER_SILENCE)).toBe(1)
    expect(toSteps(0.5)).toBe(METER_STEPS / 2)
    expect(toSteps(1)).toBe(METER_STEPS)
    expect(toSteps(3)).toBe(METER_STEPS)
    expect(toSteps(-1)).toBe(0)
  })
  it('the calm level uses fewer segments', () => {
    expect(toSteps(1, METER_STEPS_CALM)).toBe(METER_STEPS_CALM)
    expect(toSteps(0.5, METER_STEPS_CALM)).toBeLessThanOrEqual(3)
  })
  it('aria-valuenow is a whole percent in 0..100 that only moves in segment steps', () => {
    expect(stepsToPercent(0)).toBe(0)
    expect(stepsToPercent(METER_STEPS)).toBe(100)
    expect(stepsToPercent(3)).toBe(30)
    expect(stepsToPercent(99)).toBe(100)
    expect(stepsToPercent(-4)).toBe(0)
    expect(stepsToPercent(1, METER_STEPS_CALM)).toBe(20)
    const seen = new Set<number>()
    for (let i = 0; i <= 100; i++) seen.add(stepsToPercent(toSteps(i / 100)))
    expect(seen.size).toBeLessThanOrEqual(METER_STEPS + 1)
  })
})

describe('meterProfile (sensory level)', () => {
  it('calm = coarse steps, no easing, slower release', () => {
    const calm = meterProfile('calm')
    const normal = meterProfile('normal')
    expect(calm.steps).toBe(METER_STEPS_CALM)
    expect(calm.animate).toBe(false)
    expect(calm.smoother.releaseMs).toBeGreaterThan(normal.smoother.releaseMs)
    expect(normal.steps).toBe(METER_STEPS)
    expect(normal.animate).toBe(true)
    expect(meterProfile('festive').steps).toBe(METER_STEPS)
  })
})
