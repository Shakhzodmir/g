/*
 * In-memory "adult area unlocked" state. It lives only in this page session (a reload, a new tab or a shared
 * link shows the ParentGate again) and it is deliberately short-lived:
 *  - it is dropped as soon as the user leaves the /parent tree (the area component unmounts),
 *  - it expires after IDLE_LOCK_MS without any interaction,
 *  - browser history is never trusted: Back / Forward / a typed #/parent/... URL re-enter through the gate.
 * Nothing is persisted on purpose.
 */

/** Ten minutes without a touch, click or key press locks the adult area again. */
export const IDLE_LOCK_MS = 10 * 60 * 1000

let unlocked = false
let lastActivity = 0

/** True while the area is unlocked and the last interaction was less than IDLE_LOCK_MS ago. */
export function isParentUnlocked(now = Date.now()): boolean {
  if (!unlocked) return false
  if (now - lastActivity > IDLE_LOCK_MS) {
    unlocked = false
    return false
  }
  return true
}

export function markParentUnlocked(now = Date.now()): void {
  unlocked = true
  lastActivity = now
}

/** Records an interaction; ignored while locked (it can never re-open the area). */
export function touchParent(now = Date.now()): void {
  if (unlocked && now - lastActivity <= IDLE_LOCK_MS) lastActivity = now
}

export function lockParent(): void {
  unlocked = false
  lastActivity = 0
}

/** Whether a route belongs to the adult tree (a hash route such as `/parent/settings`). */
export function inParentTree(pathname: string): boolean {
  return pathname === '/parent' || pathname.startsWith('/parent/')
}

/**
 * Whether entering /parent can skip the gate. Only the in-memory unlock counts: history entries and
 * `location.state` are NOT trusted (Back and typed URLs would otherwise bypass the gate). In development,
 * `?qa` unlocks for automated screenshots.
 */
export function trustedEntry(loc: { search: string }, dev: boolean, now = Date.now()): boolean {
  if (isParentUnlocked(now)) return true
  return dev && new URLSearchParams(loc.search).has('qa')
}
