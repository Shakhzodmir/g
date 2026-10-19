/*
 * Leaving the calm corner must put the child back where she was ("Break" is a pause, not a reset).
 *
 * The shell opens /calm with a normal push (history: /talk -> /calm), so one step back is exactly the place the
 * Break button was pressed, and the browser Back button then behaves the same way. Going "forward" to / or to
 * the old path would add entries (/talk -> /calm -> / -> /calm) and Back would re-enter the calm corner.
 */

export type CalmExit = { kind: 'back' } | { kind: 'to'; path: string }

/** `idx`: react-router's position in this tab's history (history.state.idx); `from`: optional path the shell passed in location state. */
export function calmExit(opts: { idx: unknown; from?: unknown }): CalmExit {
  const idx = typeof opts.idx === 'number' ? opts.idx : 0
  if (idx > 0) return { kind: 'back' }
  // Opened directly (reload, shared link): there is nothing behind us, so go to the place the shell remembered, else Home.
  const from = typeof opts.from === 'string' ? opts.from : ''
  if (from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/calm') && !from.startsWith('/onboarding')) return { kind: 'to', path: from }
  return { kind: 'to', path: '/' }
}
