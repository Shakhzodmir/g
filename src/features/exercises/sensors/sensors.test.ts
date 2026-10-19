import { describe, expect, it } from 'vitest'
import { analyzeFrame, lowBandRatio, powerSpectrum, rms, spectralFlatness } from './audioFeatures'
import { baselineOf, metricValue, poseActive } from './blendMetric'
import { assessCalibration, createBlowDetector, estimateFloor, type BlowState } from './blowDetector'
import { createHoldCounter } from './holdCounter'
import { add, FRAME, FRAME_MS, frames, lowNoise, sine, SR, voiced, whiteNoise } from './synth'
import { createVoiceActivity, voiceLevel } from './voiceActivity'

describe('rms', () => {
  it('is 0 for silence and A/√2 for a sine', () => {
    expect(rms(new Float32Array(1024))).toBe(0)
    expect(rms([])).toBe(0)
    expect(rms(sine(FRAME, 440, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })
  it('is |A| for a constant signal', () => {
    expect(rms([0.2, -0.2, 0.2, -0.2])).toBeCloseTo(0.2, 6)
  })
})

describe('lowBandRatio', () => {
  it('is ~1 for a low tone and small for a high tone', () => {
    expect(lowBandRatio(powerSpectrum(sine(FRAME, 300)), SR)).toBeGreaterThan(0.95)
    expect(lowBandRatio(powerSpectrum(sine(FRAME, 5000)), SR)).toBeLessThan(0.05)
  })
  it('is high for low-pass noise and low for white noise', () => {
    expect(lowBandRatio(powerSpectrum(lowNoise(FRAME, 0.3, 300)), SR)).toBeGreaterThan(0.6)
    expect(lowBandRatio(powerSpectrum(whiteNoise(FRAME, 0.2)), SR)).toBeLessThan(0.1)
  })
})

describe('spectralFlatness', () => {
  it('is near 0 for a pure tone and a voiced sound', () => {
    expect(spectralFlatness(powerSpectrum(sine(FRAME, 440)), SR)).toBeLessThan(0.01)
    expect(spectralFlatness(powerSpectrum(voiced(FRAME, 220)), SR)).toBeLessThan(0.05)
  })
  it('is high for noise', () => {
    expect(spectralFlatness(powerSpectrum(whiteNoise(FRAME, 0.2)), SR)).toBeGreaterThan(0.4)
    expect(spectralFlatness(powerSpectrum(lowNoise(FRAME, 0.3, 600)), SR)).toBeGreaterThan(0.3)
  })
  it('is 0 for silence', () => {
    expect(spectralFlatness(powerSpectrum(new Float32Array(FRAME)), SR)).toBe(0)
  })
})

/** Runs a signal through calibration (quiet room) + the detector, returns the per-frame states. */
function runBlow(signal: Float32Array, opts?: { minMs?: number; sensitivity?: number }): BlowState[] {
  const room = frames(whiteNoise(FRAME * 36, 0.002, 11)) // ≈1.5 s
  const floor = estimateFloor(room.map((f) => rms(f)))
  const det = createBlowDetector({ minMs: opts?.minMs ?? 250, sensitivity: opts?.sensitivity ?? 5 }, floor)
  return frames(signal).map((f, i) => det.update(analyzeFrame(f, SR), i * FRAME_MS))
}

describe('blow detector', () => {
  const quiet = (n: number) => whiteNoise(FRAME * n, 0.002, 5)

  it('detects broadband low noise lasting ≥ minMs', () => {
    const blowFrames = 20 // ≈ 850 ms
    const sig = add(lowNoise(FRAME * blowFrames, 0.15, 500), quiet(blowFrames))
    const states = runBlow(sig, { minMs: 250 })
    const firstBlow = states.findIndex((s) => s.blowing)
    expect(firstBlow).toBeGreaterThan(0)
    expect(firstBlow * FRAME_MS).toBeGreaterThanOrEqual(250)
    expect(states.at(-1)?.blowing).toBe(true)
    expect(states.at(-1)?.strength).toBeGreaterThan(0)
  })

  it('ignores a noise burst shorter than minMs', () => {
    const sig = new Float32Array(FRAME * 20)
    sig.set(quiet(20))
    sig.set(lowNoise(FRAME * 4, 0.15, 500), FRAME * 5) // ≈170 ms
    expect(runBlow(sig, { minMs: 250 }).some((s) => s.blowing)).toBe(false)
  })

  it('does not detect a 440 Hz sine, however long and loud', () => {
    const sig = add(sine(FRAME * 30, 440, 0.4), quiet(30))
    const states = runBlow(sig)
    expect(states.some((s) => s.blowing)).toBe(false)
    expect(states.some((s) => s.candidate)).toBe(false)
  })

  it('does not detect a voiced "a-a-a"', () => {
    expect(runBlow(add(voiced(FRAME * 30, 200, 0.3), quiet(30))).some((s) => s.blowing)).toBe(false)
  })

  it('does not detect a quiet room', () => {
    expect(runBlow(quiet(40)).some((s) => s.blowing)).toBe(false)
  })

  it('higher sensitivity accepts a softer blow', () => {
    const soft = add(lowNoise(FRAME * 20, 0.012, 500), quiet(20))
    expect(runBlow(soft, { sensitivity: 1 }).some((s) => s.blowing)).toBe(false)
    expect(runBlow(soft, { sensitivity: 10 }).some((s) => s.blowing)).toBe(true)
  })
})

describe('voice activity', () => {
  it('voiceLevel is 0 in a quiet room and rises with loudness', () => {
    const floor = 0.002
    expect(voiceLevel(0.002, floor, 5)).toBe(0)
    const mid = voiceLevel(0.05, floor, 5)
    const loud = voiceLevel(0.3, floor, 5)
    expect(mid).toBeGreaterThan(0)
    expect(loud).toBeGreaterThan(mid)
    expect(loud).toBeLessThanOrEqual(1)
  })

  it('higher sensitivity gives a higher level for the same sound', () => {
    expect(voiceLevel(0.03, 0.002, 9)).toBeGreaterThan(voiceLevel(0.03, 0.002, 2))
  })

  it('rises quickly on "a-a-a" and falls back to 0 in silence', () => {
    const va = createVoiceActivity(5, 0.002)
    const loud = rms(voiced(FRAME, 220, 0.2))
    let l = 0
    for (let i = 0; i < 6; i++) l = va.update(loud, FRAME_MS)
    expect(l).toBeGreaterThan(0.5)
    for (let i = 0; i < 40; i++) l = va.update(0.002, FRAME_MS)
    expect(l).toBe(0)
  })
})

describe('hold-repetition counter', () => {
  const step = 66 // ≈15 fps
  function feed(c: ReturnType<typeof createHoldCounter>, pattern: Array<[boolean, number]>, t0 = 0) {
    let t = t0
    const out = []
    for (const [active, ms] of pattern) {
      for (let e = 0; e < ms; e += step) {
        out.push(c.update(active, t))
        t += step
      }
    }
    return { out, t }
  }

  it('counts a repetition when the pose is held ≥ holdMs', () => {
    const c = createHoldCounter({ holdMs: 1000 })
    const { out } = feed(c, [[true, 1200]])
    expect(out.filter((s) => s.counted)).toHaveLength(1)
    expect(c.count).toBe(1)
  })

  it('does not count a hold shorter than holdMs', () => {
    const c = createHoldCounter({ holdMs: 1000 })
    feed(c, [[true, 700], [false, 500]])
    expect(c.count).toBe(0)
  })

  it('dips shorter than 150 ms do not reset the hold', () => {
    const c = createHoldCounter({ holdMs: 1000, graceMs: 150 })
    const { out } = feed(c, [[true, 400], [false, 100], [true, 400], [false, 100], [true, 300]])
    expect(c.count).toBe(1)
    expect(out.some((s) => s.counted)).toBe(true)
  })

  it('a long dip resets the hold', () => {
    const c = createHoldCounter({ holdMs: 1000, graceMs: 150 })
    feed(c, [[true, 600], [false, 400], [true, 600]])
    expect(c.count).toBe(0)
  })

  it('progress grows while holding', () => {
    const c = createHoldCounter({ holdMs: 1000 })
    const { out } = feed(c, [[true, 600]])
    expect(out.at(-1)!.progress).toBeGreaterThan(0.4)
    expect(out.at(-1)!.progress).toBeLessThan(1)
  })

  it('needs a release before the next repetition', () => {
    const c = createHoldCounter({ holdMs: 500 })
    feed(c, [[true, 1500]])
    expect(c.count).toBe(1)
    const { t } = feed(c, [[false, 300]], 1500)
    feed(c, [[true, 700]], t)
    expect(c.count).toBe(2)
  })
})

describe('blend metric', () => {
  const cats = [
    { categoryName: 'mouthSmileLeft', score: 0.6 },
    { categoryName: 'mouthSmileRight', score: 0.4 },
    { categoryName: 'jawOpen', score: 0.1 },
  ]
  it('reads single and averaged metrics', () => {
    expect(metricValue({ kind: 'single', name: 'jawOpen' }, cats)).toBeCloseTo(0.1)
    expect(metricValue({ kind: 'avg', names: ['mouthSmileLeft', 'mouthSmileRight'] }, cats)).toBeCloseTo(0.5)
    expect(metricValue(null, cats)).toBeNull()
    expect(metricValue({ kind: 'single', name: 'jawOpen' }, [])).toBeNull()
  })
  it('compares against the neutral baseline', () => {
    const base = baselineOf([0.1, 0.12, null, 0.08])
    expect(base).toBeCloseTo(0.1)
    expect(poseActive(0.4, base, 0.25)).toBe(true)
    expect(poseActive(0.3, base, 0.25)).toBe(false)
    expect(poseActive(null, base, 0.25)).toBe(false)
  })
})

describe('calibration quality (B12)', () => {
  const room = (n: number, amp = 0.002) => frames(whiteNoise(FRAME * n, amp, 11)).map((f) => analyzeFrame(f, SR))

  it('a quiet room gives a small floor and no warning', () => {
    const r = assessCalibration(room(36))
    expect(r.floor).toBeLessThan(0.01)
    expect(r.blowing).toBe(false)
    expect(r.noisy).toBe(false)
  })

  it('continuous blowing during the calibration is detected (not taken as a quiet room)', () => {
    const blown = frames(lowNoise(FRAME * 36, 0.15, 500)).map((f) => analyzeFrame(f, SR))
    const r = assessCalibration(blown)
    expect(r.blowing).toBe(true)
    expect(r.floor).toBeGreaterThan(0.05)
  })

  it('a few blown frames at the start do not spoil the floor', () => {
    const blownStart = frames(lowNoise(FRAME * 8, 0.15, 500)).map((f) => analyzeFrame(f, SR))
    const r = assessCalibration([...blownStart, ...room(28)])
    expect(r.blowing).toBe(false)
    expect(r.floor).toBeLessThan(0.01)
  })

  it('a loud but steady room (fan, street) is flagged noisy, not as blowing', () => {
    const loud = frames(voiced(FRAME * 36, 220, 0.2)).map((f) => analyzeFrame(f, SR)) // tonal and loud
    const r = assessCalibration(loud)
    expect(r.noisy).toBe(true)
    expect(r.blowing).toBe(false)
  })
})
