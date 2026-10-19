import { MIN_FLOOR } from './blowDetector'

/*
 * Voice activity level for "Uch, Musicha!": any sound counts (humming, "a-a-a", singing) —
 * nothing is judged, the level just says how much sound there is above the quiet room.
 */

function sens01(sensitivity: number): number {
  return (Math.min(10, Math.max(1, sensitivity)) - 1) / 9
}

/** Sound must be this loud before Musicha starts to rise. */
export function voiceThreshold(floor: number, sensitivity: number): number {
  const t = sens01(sensitivity)
  return Math.max(0.004 + (0.03 - 0.004) * (1 - t), Math.max(floor, MIN_FLOOR) * (1.8 + 3.2 * (1 - t)))
}

/** Instant 0..1 level: 0 at the threshold, 1 at ~6× the threshold (log scale, like loudness). */
export function voiceLevel(rmsValue: number, floor: number, sensitivity: number): number {
  const thr = voiceThreshold(floor, sensitivity)
  if (rmsValue <= thr) return 0
  return Math.min(1, Math.log(rmsValue / thr) / Math.log(6))
}

export interface VoiceActivity {
  /** Feeds one frame; returns the smoothed level (fast rise, slow fall). */
  update(rmsValue: number, dtMs: number): number
  setFloor(floor: number): void
  setSensitivity(s: number): void
  readonly level: number
}

export function createVoiceActivity(sensitivity = 5, initialFloor = MIN_FLOOR): VoiceActivity {
  let s = sensitivity
  let floor = Math.max(MIN_FLOOR, initialFloor)
  let level = 0
  return {
    get level() {
      return level
    },
    setFloor(v) {
      floor = Math.max(MIN_FLOOR, v)
    },
    setSensitivity(v) {
      s = v
    },
    update(rmsValue, dtMs) {
      const target = voiceLevel(rmsValue, floor, s)
      const tau = target > level ? 60 : 220
      const k = 1 - Math.exp(-Math.max(0, dtMs) / tau)
      level += (target - level) * k
      if (level < 0.005) level = 0
      // Quiet room drifts slowly; never adapt while sound is present.
      if (target === 0 && rmsValue < voiceThreshold(floor, s)) floor = Math.max(MIN_FLOOR, floor * 0.99 + rmsValue * 0.01)
      return level
    },
  }
}
