/** Page navigation for the social story reader (pure; unit-tested). */
export function clampPage(i: number, total: number): number {
  if (!(total > 0) || !Number.isFinite(i)) return 0
  return Math.min(Math.max(0, Math.trunc(i)), total - 1)
}

export const nextPage = (i: number, total: number) => clampPage(i + 1, total)
export const prevPage = (i: number, total: number) => clampPage(i - 1, total)
export const canGoPrev = (i: number, total: number) => total > 0 && clampPage(i, total) > 0
export const canGoNext = (i: number, total: number) => total > 0 && clampPage(i, total) < total - 1
export const isLastPage = (i: number, total: number) => total > 0 && clampPage(i, total) === total - 1

/** Audio key of one story page (`st.<storyId>.<pageIndex>`). */
export const storyPageKey = (storyId: string, i: number) => `st.${storyId}.${i}`

/**
 * A deliberate horizontal swipe: long enough and clearly more sideways than up/down,
 * so a shaky tap or a vertical scroll never turns the page. Swipe left = next page.
 */
export function swipeDirection(dx: number, dy: number, threshold = 64): 'next' | 'prev' | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null
  return dx < 0 ? 'next' : 'prev'
}
