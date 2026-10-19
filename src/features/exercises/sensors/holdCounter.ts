/*
 * Hold-repetition counter for "Oyna": a repetition counts when the pose is held for `holdMs`.
 * Face tracking flickers, so dips shorter than `graceMs` do not reset the hold.
 * After a repetition the child relaxes (signal off for `graceMs`) before the next one starts.
 */

export interface HoldOptions {
  holdMs: number
  /** Gaps shorter than this keep the hold going. */
  graceMs?: number
}

export interface HoldState {
  /** 0..1 progress of the current hold (for the ring). */
  progress: number
  /** True only on the update that completed a repetition. */
  counted: boolean
  count: number
  /** Waiting for the child to relax after a counted repetition. */
  waitingRelease: boolean
}

export interface HoldCounter {
  update(active: boolean, tMs: number): HoldState
  reset(): void
  readonly count: number
}

export function createHoldCounter({ holdMs, graceMs = 150 }: HoldOptions): HoldCounter {
  let start: number | null = null
  let lastActive = -Infinity
  let count = 0
  let waitingRelease = false

  const state = (progress: number, counted: boolean): HoldState => ({ progress, counted, count, waitingRelease })

  return {
    get count() {
      return count
    },
    reset() {
      start = null
      lastActive = -Infinity
      count = 0
      waitingRelease = false
    },
    update(active, tMs) {
      if (active) lastActive = tMs
      const released = !active && tMs - lastActive >= graceMs

      if (waitingRelease) {
        if (released) waitingRelease = false
        return state(0, false)
      }
      if (released) {
        start = null
        return state(0, false)
      }
      if (start === null) {
        if (!active) return state(0, false)
        start = tMs
      }
      const held = tMs - start
      if (held >= holdMs) {
        count++
        start = null
        waitingRelease = true
        return state(1, true)
      }
      return state(Math.min(1, held / holdMs), false)
    },
  }
}
