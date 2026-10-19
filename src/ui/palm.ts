/*
 * Palm rejection for the interactive whiteboard: a child leans a hand or a sleeve on the panel and the
 * touch controller reports one big contact. In board mode such contacts must not press anything.
 * A fingertip is ≈ 10–20 mm; the limit is 40 CSS px on a 1080p board and grows with the width of 4K boards
 * (more CSS px per millimetre), so a thick thumb is never mistaken for a palm.
 */

export interface ContactSize {
  width: number
  height: number
  pointerType?: string
}

/** Largest fingertip contact, CSS px. */
export const PALM_LIMIT_PX = 40
/** A touch contact wider than this is always a palm. */
export const PALM_TOUCH_LIMIT_PX = 64

export function inBoardMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.board === 'true'
}

/** Density factor: 1 up to 1920 px wide, proportionally more on wider boards. */
function density(): number {
  return typeof window === 'undefined' ? 1 : Math.max(1, window.innerWidth / 1920)
}

/** True when a pointer contact is too big to be a finger (pure; the board-mode check is `isPalm`). */
export function isPalmContact(c: ContactSize, d = 1): boolean {
  return c.width > PALM_LIMIT_PX * d || c.height > PALM_LIMIT_PX * d || (c.pointerType === 'touch' && c.width > PALM_TOUCH_LIMIT_PX * d)
}

/** Board mode only: ignore big contacts. Elsewhere nothing is ever rejected. */
export function isPalm(e: ContactSize): boolean {
  return inBoardMode() && isPalmContact(e, density())
}
