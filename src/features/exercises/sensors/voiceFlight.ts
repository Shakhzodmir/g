/*
 * Flight model of "Uch, Musicha!": sound lifts the bird, silence lets her glide down slowly.
 * Pure (no DOM, no timers) so it is unit-tested with simulated voice signals.
 *
 * Collection never depends on the direction of flight and never needs silence: the next star is collected as
 * soon as the bird is within TOLERANCE of it OR her path between two frames crosses it. The stars rise from
 * low to high, so a child who "a-a-a"s in bursts simply keeps climbing; nothing ever asks the bird to go down.
 */

/** Heights (0 = ground, 1 = top) of the five stars, one at a time, each higher than the last. */
export const STAR_HEIGHTS: readonly number[] = [0.2, 0.38, 0.55, 0.72, 0.88]
export const TOLERANCE = 0.07
/** Level (0..1) above which the voice counts as sound. */
export const VOICE_ON = 0.02
/** Glide-down speed in silence (share of the sky per second): gentle, so short bursts still add up. */
export const FALL_PER_S = 0.07
/** Velocity smoothing time constant, ms. */
const TAU_MS = 250

export interface FlightState {
  y: number
  v: number
  collected: number
}

export interface Flight {
  /** Advances by one frame; `level` is the smoothed voice level 0..1. */
  step(level: number, dtMs: number): FlightState & { gained: number }
  reset(): void
  readonly state: FlightState
}

export function createFlight(stars: readonly number[] = STAR_HEIGHTS, tolerance = TOLERANCE): Flight {
  let y = 0
  let v = 0
  let collected = 0
  return {
    get state() {
      return { y, v, collected }
    },
    reset() {
      y = 0
      v = 0
      collected = 0
    },
    step(level, dtMs) {
      const dt = Math.max(0, Math.min(100, dtMs))
      const target = level > VOICE_ON ? 0.18 + 0.5 * level : -FALL_PER_S
      v += (target - v) * (1 - Math.exp(-dt / TAU_MS))
      const prev = y
      y = Math.min(1, Math.max(0, y + (v * dt) / 1000))
      if (y <= 0 && v < 0) v = 0
      let gained = 0
      // Direction-independent: close enough, or the sweep from the previous frame crossed the star.
      for (;;) {
        const star = stars[collected]
        if (star === undefined) break
        const near = Math.abs(y - star) < tolerance
        const crossed = (prev - star) * (y - star) <= 0 && prev !== y
        if (!near && !crossed) break
        collected++
        gained++
      }
      return { y, v, collected, gained }
    },
  }
}
