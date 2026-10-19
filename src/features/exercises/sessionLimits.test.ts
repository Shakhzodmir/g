import { describe, expect, it } from 'vitest'
import { advanceSession, cooldownLeftMs, COOLDOWN_MS, minutesLeft, SESSION_MS } from './sessionLimits'

describe('blow session cooldown (B22)', () => {
  it('may play when there was no full session', () => {
    expect(cooldownLeftMs(1_000_000, null)).toBe(0)
    expect(cooldownLeftMs(1_000_000, 0)).toBe(0)
  })
  it('rests for 2 minutes after a full session, then may play again', () => {
    const end = 5_000_000
    expect(cooldownLeftMs(end + 1, end)).toBe(COOLDOWN_MS - 1)
    expect(cooldownLeftMs(end + 60_000, end)).toBe(60_000)
    expect(cooldownLeftMs(end + COOLDOWN_MS, end)).toBe(0)
    expect(cooldownLeftMs(end + COOLDOWN_MS + 1, end)).toBe(0)
  })
  it('a clock set back does not lock the game', () => {
    expect(cooldownLeftMs(1000, 9_000_000)).toBe(0)
  })
  it('counts whole minutes, at least one', () => {
    expect(minutesLeft(1)).toBe(1)
    expect(minutesLeft(60_000)).toBe(1)
    expect(minutesLeft(60_001)).toBe(2)
    expect(minutesLeft(120_000)).toBe(2)
  })
})

describe('session clock (B6)', () => {
  it('counts active time only', () => {
    let e = 0
    e = advanceSession(e, 250, false)
    e = advanceSession(e, 10_000, true) // page hidden: not counted
    e = advanceSession(e, 250, false)
    expect(e).toBe(500)
  })
  it('reaches the limit only through active play', () => {
    let e = 0
    for (let i = 0; i < 1000; i++) e = advanceSession(e, 250, true)
    expect(e).toBeLessThan(SESSION_MS)
    for (let i = 0; i < SESSION_MS / 250; i++) e = advanceSession(e, 250, false)
    expect(e).toBeGreaterThanOrEqual(SESSION_MS)
  })
})
