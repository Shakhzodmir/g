/*
 * In-memory "adult area unlocked" flag. It lives only for this page session: a reload in a fresh tab or a
 * shared link straight to #/parent shows the ParentGate again. Nothing is persisted on purpose.
 */
let unlocked = false

export function isParentUnlocked(): boolean {
  return unlocked
}

export function markParentUnlocked(): void {
  unlocked = true
}

export function lockParent(): void {
  unlocked = false
}

/**
 * Whether the current entry into /parent can be trusted without showing the gate again.
 * - An in-app navigation (history key other than react-router's initial 'default') can only come from the
 *   home screen's ParentGate in v0.1, so it counts as passed.
 * - `state.parentUnlocked` lets other screens say so explicitly.
 * - In development, `?qa` unlocks for automated screenshots.
 */
export function trustedEntry(loc: { key: string; state: unknown; search: string }, dev: boolean): boolean {
  if (unlocked) return true
  if (loc.key !== 'default') return true
  if ((loc.state as { parentUnlocked?: boolean } | null)?.parentUnlocked === true) return true
  return dev && new URLSearchParams(loc.search).has('qa')
}
