import { describe, expect, it } from 'vitest'
import {
  clampMinutes,
  createTimer,
  formatClock,
  fractionLeft,
  pause,
  remainingMs,
  reset,
  sectorAngle,
  sectorPath,
  start,
  tick,
} from './timerLogic'

const MIN = 60_000

describe('timer state', () => {
  it('counts down against wall-clock time', () => {
    const t0 = 1_000_000
    const s = start(createTimer(2 * MIN), t0)
    expect(s.status).toBe('running')
    expect(remainingMs(s, t0 + 30_000)).toBe(90_000)
    expect(fractionLeft(s, t0 + MIN)).toBeCloseTo(0.5)
  })

  it('stays correct when the tab was throttled for a long time', () => {
    const t0 = 0
    const s = start(createTimer(MIN), t0)
    // No ticks for 10 minutes, then one frame: it is simply done.
    const later = tick(s, t0 + 10 * MIN)
    expect(later.status).toBe('done')
    expect(remainingMs(later, t0 + 10 * MIN)).toBe(0)
    expect(fractionLeft(later, t0 + 10 * MIN)).toBe(0)
  })

  it('pauses and resumes without losing time', () => {
    let s = start(createTimer(MIN), 0)
    s = pause(s, 20_000)
    expect(s.status).toBe('paused')
    expect(remainingMs(s, 500_000)).toBe(40_000)
    s = start(s, 500_000)
    expect(remainingMs(s, 510_000)).toBe(30_000)
    expect(tick(s, 539_999).status).toBe('running')
    expect(tick(s, 540_000).status).toBe('done')
  })

  it('reset returns to the full duration; starting a finished timer starts over', () => {
    const done = tick(start(createTimer(MIN), 0), MIN)
    expect(reset(done)).toEqual(createTimer(MIN))
    const again = start(done, 5 * MIN)
    expect(remainingMs(again, 5 * MIN)).toBe(MIN)
  })

  it('ignores pause when not running and start when running', () => {
    const idle = createTimer(MIN)
    expect(pause(idle, 10)).toBe(idle)
    const run = start(idle, 0)
    expect(start(run, 100)).toBe(run)
  })

  it('clamps custom minutes', () => {
    expect(clampMinutes(0)).toBe(1)
    expect(clampMinutes(7.4)).toBe(7)
    expect(clampMinutes(500)).toBe(60)
    expect(clampMinutes(Number.NaN)).toBe(1)
  })
})

describe('sector geometry', () => {
  it('maps fraction to degrees', () => {
    expect(sectorAngle(1)).toBe(360)
    expect(sectorAngle(0.25)).toBe(90)
    expect(sectorAngle(-1)).toBe(0)
    expect(sectorAngle(2)).toBe(360)
  })

  it('draws a quarter sector from 12 to 3 o’clock', () => {
    expect(sectorPath(90, 50, 50, 40)).toBe('M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z')
  })

  it('uses the large-arc flag past half and handles empty/full', () => {
    expect(sectorPath(270, 50, 50, 40)).toContain(' 0 1 1 ')
    expect(sectorPath(0, 50, 50, 40)).toBe('')
    expect(sectorPath(360, 50, 50, 40)).toContain('A 40 40 0 1 1 50 90')
  })
})

describe('clock digits', () => {
  it('rounds up to whole seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(1)).toBe('0:01')
    expect(formatClock(59_001)).toBe('1:00')
    expect(formatClock(15 * MIN)).toBe('15:00')
  })
})
