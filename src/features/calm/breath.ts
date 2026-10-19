/** Breathing guide timing for the calm corner: slow inhale, longer exhale (4 s in, 6 s out). */
export const INHALE_MS = 4000
export const EXHALE_MS = 6000
export const MIN_SCALE = 0.6
export const MAX_SCALE = 1

export type BreathPhase = 'in' | 'out'

export interface BreathState {
  phase: BreathPhase
  /** 0..1 progress inside the current phase. */
  progress: number
  /** Shape scale between MIN_SCALE (empty lungs) and MAX_SCALE (full). */
  scale: number
  /** Number of completed in+out cycles. */
  cycle: number
}

/** Smooth start and stop without any overshoot (no bounce). */
export function easeInOutSine(p: number): number {
  return 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, p))) / 2
}

/** Pure breathing state for a time since the guide started. */
export function breathAt(elapsedMs: number, inhaleMs = INHALE_MS, exhaleMs = EXHALE_MS): BreathState {
  const t = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0
  const period = inhaleMs + exhaleMs
  const cycle = Math.floor(t / period)
  const within = t - cycle * period
  if (within < inhaleMs) {
    const progress = within / inhaleMs
    return { phase: 'in', progress, scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * easeInOutSine(progress), cycle }
  }
  const progress = (within - inhaleMs) / exhaleMs
  return { phase: 'out', progress, scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * (1 - easeInOutSine(progress)), cycle }
}
