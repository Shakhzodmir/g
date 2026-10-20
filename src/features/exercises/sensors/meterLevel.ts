import type { Sensory } from '../../../store/profileTypes'

/*
 * Level meter of the voice exercises: "we hear you". Pure functions, no Web Audio, so everything is unit-tested.
 * The meter never judges (a quiet voice and a loud one both light it); it only shows that sound arrives.
 * It is calm by construction: fast to rise, slow to fall, a silence floor so the room's hum draws nothing, and a few
 * coarse steps instead of a flickering continuous bar.
 */

/** Segments of the meter in the normal / festive sensory levels. */
export const METER_STEPS = 10
/** Segments in the calm level (and with reduced motion): fewer, steadier changes. */
export const METER_STEPS_CALM = 5
/** Below this smoothed level the meter shows nothing at all (silence floor). */
export const METER_SILENCE = 0.04

export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
}

/**
 * Display level 0..1 of a raw loudness (rms). Nothing happens below `silence`; it reaches 1 at `full`.
 * Log scale, like loudness, so a whisper and a shout both stay on the bar.
 */
export function levelFromRms(rms: number, silence: number, full: number): number {
  if (!(silence > 0) || !(full > silence) || !(rms > silence)) return 0
  return clamp01(Math.log(rms / silence) / Math.log(full / silence))
}

/** Level for the breath exercise: starts at half of the detection threshold, is full at three times the threshold. */
export function levelFromThreshold(rms: number, threshold: number): number {
  return levelFromRms(rms, threshold * 0.5, threshold * 3)
}

export interface MeterSmoother {
  /** Feeds the raw level (0..1) of the last `dtMs`; returns the smoothed level. */
  update(target: number, dtMs: number): number
  reset(): void
  readonly value: number
}

export interface SmootherOptions {
  /** Time constant when the level rises, ms. */
  attackMs?: number
  /** Time constant when the level falls, ms. */
  releaseMs?: number
  /** Levels below this are silence: the target counts as 0 and the output snaps to 0. */
  silence?: number
}

/** Fast attack, slow release, silence floor. Output is always inside 0..1. */
export function createMeterSmoother({ attackMs = 70, releaseMs = 420, silence = METER_SILENCE }: SmootherOptions = {}): MeterSmoother {
  let value = 0
  return {
    get value() {
      return value
    },
    reset() {
      value = 0
    },
    update(target, dtMs) {
      const want = clamp01(target) < silence ? 0 : clamp01(target)
      const tau = want > value ? attackMs : releaseMs
      const k = tau > 0 ? 1 - Math.exp(-Math.max(0, Number.isFinite(dtMs) ? dtMs : 0) / tau) : 1
      value += (want - value) * k
      if (value < silence && want === 0) value = 0
      value = clamp01(value)
      return value
    },
  }
}

/** The filled segments (0..steps) of a level. Any sound that clears the silence floor lights at least one segment. */
export function toSteps(level: number, steps: number = METER_STEPS): number {
  const n = Math.max(1, Math.floor(steps))
  const v = clamp01(level)
  if (v < METER_SILENCE) return 0
  return Math.min(n, Math.max(1, Math.round(v * n)))
}

/** `aria-valuenow`: a whole percent that moves in the steps the eye sees (never in 30 tiny jumps per second). */
export function stepsToPercent(filled: number, steps: number = METER_STEPS): number {
  const n = Math.max(1, Math.floor(steps))
  return Math.round((Math.min(n, Math.max(0, Math.floor(filled))) / n) * 100)
}

export interface MeterProfile {
  steps: number
  smoother: Required<SmootherOptions>
  /** Whether the bar may ease between segments (never with reduced motion or the calm sensory level). */
  animate: boolean
}

/** Meter behaviour for the sensory level that really applies (`effectiveSensory`: reduced motion already forces calm). */
export function meterProfile(sensory: Sensory): MeterProfile {
  if (sensory === 'calm') return { steps: METER_STEPS_CALM, smoother: { attackMs: 120, releaseMs: 650, silence: METER_SILENCE }, animate: false }
  return { steps: METER_STEPS, smoother: { attackMs: 70, releaseMs: 420, silence: METER_SILENCE }, animate: true }
}
