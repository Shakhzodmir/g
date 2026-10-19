/*
 * Dizziness limit of the breathing game: a session lasts at most SESSION_MS of ACTIVE play (the clock stops
 * while the page is hidden), then the child rests for COOLDOWN_MS before the next full session.
 */

/** Breathing games stop after 2 minutes so the child does not get dizzy. */
export const SESSION_MS = 120_000
/** After a full session the game stays closed for this long. */
export const COOLDOWN_MS = 120_000

/** Milliseconds of rest still left after a full session ended at `lastEnd` (0 = may play). */
export function cooldownLeftMs(now: number, lastEnd: number | null | undefined, cooldownMs = COOLDOWN_MS): number {
  if (!lastEnd || lastEnd <= 0) return 0
  // A clock set back must not lock the game for hours.
  if (lastEnd > now) return 0
  return Math.max(0, lastEnd + cooldownMs - now)
}

/** Advances the active-play clock; time spent while hidden is not counted. */
export function advanceSession(elapsedMs: number, dtMs: number, hidden: boolean): number {
  return hidden ? elapsedMs : elapsedMs + Math.max(0, dtMs)
}

/** Whole minutes (rounded up) for the «Dam olamiz» note. */
export function minutesLeft(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000))
}
