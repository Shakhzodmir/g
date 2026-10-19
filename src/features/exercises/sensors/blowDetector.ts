import type { AudioFeatures } from './audioFeatures'

/*
 * Blow detector: a frame looks like blowing when it is (1) louder than the adaptive noise floor,
 * (2) dominated by low frequencies (wind rumble on the microphone) and (3) noise-like
 * (high spectral flatness — a hum, a whistle or "a-a-a" is tonal and stays out).
 * Blowing is reported only after such frames have lasted at least `minMs`.
 */

export interface BlowOptions {
  /** 1 (needs a strong blow) … 10 (a light breath is enough). Adult slider. */
  sensitivity?: number
  /** Blow-like sound must last this long before it counts. */
  minMs?: number
  /** Short gaps inside a blow (ms) that do not end it. */
  releaseMs?: number
}

export interface BlowState {
  /** A blow is in progress (held ≥ minMs). */
  blowing: boolean
  /** This frame alone looks like blowing. */
  candidate: boolean
  /** 0..1 how strong the blow is (for scene feedback). */
  strength: number
  floor: number
  threshold: number
}

/** Smallest floor we trust: a digitally silent input must not make every click a "blow". */
export const MIN_FLOOR = 0.002

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function sens01(sensitivity: number): number {
  return (Math.min(10, Math.max(1, sensitivity)) - 1) / 9
}

/** Loudness the frame must exceed: a multiple of the noise floor plus an absolute minimum. */
export function loudnessThreshold(floor: number, sensitivity: number): number {
  const t = sens01(sensitivity)
  return Math.max(lerp(0.05, 0.008, t), Math.max(floor, MIN_FLOOR) * lerp(7, 2, t))
}

export function minLowRatio(sensitivity: number): number {
  return lerp(0.6, 0.4, sens01(sensitivity))
}

export const MIN_FLATNESS = 0.2

export function isBlowLike(f: AudioFeatures, floor: number, sensitivity: number): boolean {
  return f.rms >= loudnessThreshold(floor, sensitivity) && f.lowRatio >= minLowRatio(sensitivity) && f.flatness >= MIN_FLATNESS
}

/**
 * Floor of the quiet room from the calibration frames (≈1.5 s). The lower quartile is used (a "rolling minimum"
 * in spirit): a cough, a click or even a few blown frames at the start do not raise the floor.
 */
export function estimateFloor(rmsValues: number[]): number {
  if (!rmsValues.length) return MIN_FLOOR
  const sorted = [...rmsValues].sort((a, b) => a - b)
  const q = sorted[Math.floor((sorted.length - 1) * 0.25)]
  return Math.max(MIN_FLOOR, q)
}

/** A calibrated floor at or above this means the room is loud (shown as «Xona shovqinli»). */
export const NOISY_FLOOR = 0.03
/** Frames louder than this and blow-shaped during calibration mean somebody was blowing, not a quiet room. */
export const CALIBRATION_BLOW_RMS = 0.02

export interface CalibrationResult {
  floor: number
  /** Most of the calibration was a blow-like sound: the child blew instead of keeping quiet. Measure again. */
  blowing: boolean
  /** The room itself is loud. */
  noisy: boolean
}

/** Judges the calibration frames: the floor, whether it was spoiled by continuous blowing, whether the room is loud. */
export function assessCalibration(frames: AudioFeatures[]): CalibrationResult {
  const floor = estimateFloor(frames.map((f) => f.rms))
  const blowLike = frames.filter((f) => f.rms >= CALIBRATION_BLOW_RMS && f.lowRatio >= minLowRatio(5) && f.flatness >= MIN_FLATNESS).length
  const blowing = frames.length > 0 && blowLike / frames.length >= 0.6
  return { floor, blowing, noisy: floor >= NOISY_FLOOR }
}

export interface BlowDetector {
  update(f: AudioFeatures, tMs: number): BlowState
  setFloor(floor: number): void
  setSensitivity(s: number): void
  reset(): void
  readonly floor: number
}

export function createBlowDetector(opts: BlowOptions = {}, initialFloor = MIN_FLOOR): BlowDetector {
  let sensitivity = opts.sensitivity ?? 5
  const minMs = opts.minMs ?? 250
  const releaseMs = opts.releaseMs ?? 150
  let floor = Math.max(MIN_FLOOR, initialFloor)
  let runStart: number | null = null
  let lastCandidate = -Infinity
  let blowing = false

  return {
    get floor() {
      return floor
    },
    setFloor(v) {
      floor = Math.max(MIN_FLOOR, v)
    },
    setSensitivity(s) {
      sensitivity = s
    },
    reset() {
      runStart = null
      lastCandidate = -Infinity
      blowing = false
    },
    update(f, tMs) {
      const threshold = loudnessThreshold(floor, sensitivity)
      const candidate = isBlowLike(f, floor, sensitivity)
      if (candidate) {
        if (runStart === null) runStart = tMs
        lastCandidate = tMs
        if (tMs - runStart >= minMs) blowing = true
      } else if (tMs - lastCandidate >= releaseMs) {
        runStart = null
        blowing = false
      }
      // The floor follows slow changes of the room (fan, street) only while nobody is blowing.
      if (!candidate && runStart === null && f.rms < threshold) floor = Math.max(MIN_FLOOR, floor * 0.98 + f.rms * 0.02)
      const strength = blowing ? Math.min(1, Math.max(0.15, (f.rms - threshold) / (threshold * 3) + 0.15)) : 0
      return { blowing, candidate, strength, floor, threshold }
    },
  }
}
