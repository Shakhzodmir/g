import type { FocusEvent } from 'react'

/**
 * Keyboard focus ring for a <label> that wraps a visually hidden radio. `label:has(:focus-visible)` would do it in CSS,
 * but :has() needs Chrome 105 / Safari 15.4, so the focused input marks its label with `data-focus` instead
 * (styled by `[data-focus]`). Only keyboard-style focus counts, like :focus-visible.
 */
export function markFocusVisible(e: FocusEvent<HTMLInputElement>): void {
  const label = e.currentTarget.closest('label')
  if (!label) return
  let visible = true
  try {
    visible = e.currentTarget.matches(':focus-visible')
  } catch {
    // very old engine without :focus-visible: show the ring on every focus, never hide it
  }
  label.toggleAttribute('data-focus', visible)
}

export function clearFocusVisible(e: FocusEvent<HTMLInputElement>): void {
  e.currentTarget.closest('label')?.removeAttribute('data-focus')
}
