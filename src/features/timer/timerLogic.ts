/*
 * Pure visual-timer model. Time is measured against wall-clock timestamps (Date.now()),
 * so a throttled or backgrounded tab is always correct the moment it renders again.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done'

export interface TimerState {
  status: TimerStatus
  durationMs: number
  /** Wall-clock end time while running. */
  endsAt: number | null
  /** Remaining time while idle/paused (equals durationMs when idle). */
  remainingMs: number
}

export const PRESET_MINUTES = [1, 2, 3, 5, 10, 15] as const
export const MIN_MINUTES = 1
export const MAX_MINUTES = 60

export function clampMinutes(m: number): number {
  if (!Number.isFinite(m)) return MIN_MINUTES
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(m)))
}

export function createTimer(durationMs: number): TimerState {
  const d = Math.max(1000, Math.round(durationMs))
  return { status: 'idle', durationMs: d, endsAt: null, remainingMs: d }
}

export function remainingMs(s: TimerState, now: number): number {
  if (s.status === 'running' && s.endsAt !== null) return Math.max(0, s.endsAt - now)
  if (s.status === 'done') return 0
  return s.remainingMs
}

/** Fraction of time left, 1 → 0. */
export function fractionLeft(s: TimerState, now: number): number {
  if (s.durationMs <= 0) return 0
  return Math.min(1, Math.max(0, remainingMs(s, now) / s.durationMs))
}

export function start(s: TimerState, now: number): TimerState {
  if (s.status === 'running') return s
  const left = s.status === 'done' || s.remainingMs <= 0 ? s.durationMs : s.remainingMs
  return { ...s, status: 'running', endsAt: now + left, remainingMs: left }
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s
  return { ...s, status: 'paused', endsAt: null, remainingMs: remainingMs(s, now) }
}

export function reset(s: TimerState): TimerState {
  return createTimer(s.durationMs)
}

export function setDuration(_s: TimerState, durationMs: number): TimerState {
  return createTimer(durationMs)
}

/** Advances the state machine: a running timer whose end has passed becomes 'done'. */
export function tick(s: TimerState, now: number): TimerState {
  if (s.status === 'running' && s.endsAt !== null && now >= s.endsAt) return { ...s, status: 'done', endsAt: null, remainingMs: 0 }
  return s
}

/** Sector angle in degrees (360 = full time left). */
export function sectorAngle(fraction: number): number {
  return 360 * Math.min(1, Math.max(0, fraction))
}

/**
 * SVG path of the remaining-time sector: starts at 12 o'clock and spans `angle` degrees clockwise,
 * so the coloured part shrinks back towards 12 as time passes. Returns '' for an empty sector;
 * a full circle is drawn as two arcs (a single 360° arc is degenerate in SVG).
 */
export function sectorPath(angleDeg: number, cx: number, cy: number, r: number): string {
  const a = Math.min(360, Math.max(0, angleDeg))
  if (a <= 0.05) return ''
  const f = (n: number) => Number(n.toFixed(3))
  if (a >= 359.95) {
    return `M ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy + r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy - r)} Z`
  }
  const rad = ((a - 90) * Math.PI) / 180
  const x = cx + r * Math.cos(rad)
  const y = cy + r * Math.sin(rad)
  const large = a > 180 ? 1 : 0
  return `M ${f(cx)} ${f(cy)} L ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 ${large} 1 ${f(x)} ${f(y)} Z`
}

/** Digits for adults: m:ss, rounded up so "0:00" only shows when time is really over. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
