/**
 * Marks <html data-bigtext> when the text is so large for the screen that a normal word no longer fits a line
 * (browser / system text size around 150 % or more on a phone: fewer than ~17.5 root-em of width). The stylesheet then
 * lets any word break anywhere (design/global.css) instead of pushing the page sideways. The app's own text-size
 * setting and board mode never reach this: their roots are small relative to the viewport width.
 */
export const BIGTEXT_MAX_EM = 17.5

export function isBigText(viewportWidth: number, rootFontPx: number): boolean {
  return rootFontPx > 0 && viewportWidth / rootFontPx < BIGTEXT_MAX_EM
}

export function setupBigText(): void {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const check = () => {
    const px = parseFloat(getComputedStyle(root).fontSize)
    root.toggleAttribute('data-bigtext', isBigText(root.clientWidth || window.innerWidth, px))
  }
  check()
  window.addEventListener('resize', check, { passive: true })
  window.addEventListener('orientationchange', check, { passive: true })
  // the app changes the root font size itself (text-size setting, board scale): look again when it does
  new MutationObserver(check).observe(root, { attributes: true, attributeFilter: ['style', 'data-tscale', 'data-board'] })
}
