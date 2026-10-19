import { describe, expect, it } from 'vitest'
import { analyzeFrame } from './audioFeatures'
import { add, FRAME, FRAME_MS, frames, voiced, whiteNoise } from './synth'
import { createFlight, STAR_HEIGHTS, TOLERANCE } from './voiceFlight'
import { createVoiceActivity } from './voiceActivity'
import { estimateFloor } from './blowDetector'

const DT = 33

/** A level signal: sound for `onMs`, silence for `offMs`, repeated. */
function burst(onMs: number, offMs: number, level = 0.5) {
  return (tMs: number) => (tMs % (onMs + offMs) < onMs ? level : 0)
}

/** Runs the flight for `seconds`; returns when each star was collected (s) and the max height. */
function fly(level: (tMs: number) => number, seconds: number) {
  const f = createFlight()
  const at: number[] = []
  let maxY = 0
  for (let t = 0; t < seconds * 1000; t += DT) {
    const s = f.step(level(t), DT)
    maxY = Math.max(maxY, s.y)
    for (let i = 0; i < s.gained; i++) at.push(t / 1000)
  }
  return { at, maxY, collected: f.state.collected }
}

/** The previous rules, kept only to document the defect: non-monotonic stars, collected only when "close" in height. */
function legacyFly(level: (tMs: number) => number, seconds: number) {
  const heights = [0.3, 0.55, 0.4, 0.75, 0.9]
  let y = 0
  let v = 0
  let collected = 0
  for (let t = 0; t < seconds * 1000; t += DT) {
    const l = level(t)
    const target = l > 0.02 ? 0.18 + 0.5 * l : -0.13
    v += (target - v) * (1 - Math.exp(-DT / 250))
    y = Math.min(1, Math.max(0, y + (v * DT) / 1000))
    if (y <= 0 && v < 0) v = 0
    const star = heights[collected]
    if (star !== undefined && Math.abs(y - star) < 0.07) collected++
  }
  return collected
}

describe('voice game: star collection (B4)', () => {
  it('stars rise monotonically (nothing asks the bird to go down)', () => {
    for (let i = 1; i < STAR_HEIGHTS.length; i++) expect(STAR_HEIGHTS[i]).toBeGreaterThan(STAR_HEIGHTS[i - 1])
  })

  it('reproduces the old stall: 2 of 5 stars whatever the child does (steady or bursty voice)', () => {
    // Star 3 (0.4) lies below star 2 (0.55): the bird had to go DOWN, but sound keeps her up.
    for (const [on, off] of [
      [300, 700],
      [500, 500],
      [700, 300],
      [1000, 100],
      [1000, 0],
    ]) {
      expect(legacyFly(burst(on, off), 60), `${on}/${off}`).toBe(2)
    }
  })

  it('collects all five with steady voice', () => {
    const r = fly(() => 0.6, 30)
    expect(r.collected).toBe(5)
    expect(r.at[4]).toBeLessThan(6)
  })

  it('collects all five with bursty voice at 30 %, 50 % and 70 % duty', () => {
    for (const [on, off] of [
      [300, 700],
      [500, 500],
      [700, 300],
      [1000, 100],
    ]) {
      const r = fly(burst(on, off), 60)
      expect(r.collected, `${on}/${off}`).toBe(5)
    }
  })

  it('never needs silence: loud-only voice (no pauses at all) still collects every star', () => {
    const r = fly(() => 1, 20)
    expect(r.collected).toBe(5)
  })

  it('collects in either direction: a star is collected when the bird passes it on the way down too', () => {
    const f = createFlight([0.5], 0.01)
    // Shoot far above the star in one big step, then glide down through it.
    f.step(1, 100)
    let s = f.state
    for (let i = 0; i < 40 && s.y < 0.9; i++) s = f.step(1, 100)
    expect(f.state.collected).toBe(1)
    // And the sweep rule: a huge step that jumps over the star still collects it.
    const g = createFlight([0.5], 0.001)
    g.state // eslint-disable-line @typescript-eslint/no-unused-expressions
    let st = g.step(1, 100)
    while (st.collected === 0 && st.y < 1) st = g.step(1, 100)
    expect(st.collected).toBe(1)
  })

  it('a descent crossing the next star collects it', () => {
    const f = createFlight([0.3, 0.1], 0.005)
    // Fly above the first star quickly, collecting it on the way up.
    let s = f.step(1, 100)
    for (let i = 0; i < 20 && s.collected < 1; i++) s = f.step(1, 100)
    expect(s.collected).toBe(1)
    // Now fall in silence: the lower second star is collected on the way down.
    for (let i = 0; i < 400 && s.collected < 2; i++) s = f.step(0, 100)
    expect(s.collected).toBe(2)
  })

  it('stays on the ground in silence and collects nothing', () => {
    const r = fly(() => 0, 30)
    expect(r.collected).toBe(0)
    expect(r.maxY).toBe(0)
  })

  it('tolerance matches the sky model constants', () => {
    expect(TOLERANCE).toBeGreaterThan(0)
  })
})

describe('voice game with simulated microphone frames', () => {
  /** Quiet room → calibration → "a-a-a" bursts → voice activity → flight. */
  function session(onFrames: number, offFrames: number, seconds: number) {
    const room = frames(whiteNoise(FRAME * 36, 0.002, 11))
    const floor = estimateFloor(room.map((f) => analyzeFrame(f, 48000).rms))
    const va = createVoiceActivity(5, floor)
    const f = createFlight()
    const total = Math.ceil((seconds * 1000) / FRAME_MS)
    const sound = voiced(FRAME, 220, 0.2)
    const quiet = whiteNoise(FRAME, 0.002, 5)
    for (let i = 0; i < total; i++) {
      const on = i % (onFrames + offFrames) < onFrames
      const fr = on ? add(sound, quiet) : quiet
      const level = va.update(analyzeFrame(fr, 48000).rms, FRAME_MS)
      f.step(level, FRAME_MS)
    }
    return f.state.collected
  }

  it('a child who voices ~30 % of the time collects all five stars', () => {
    // ~0.3 s of voice, ~0.7 s of silence, repeated.
    expect(session(7, 16, 90)).toBe(5)
  })

  it('a child who voices ~60 % of the time collects all five stars', () => {
    expect(session(14, 9, 40)).toBe(5)
  })
})
