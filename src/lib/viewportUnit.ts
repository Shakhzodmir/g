/**
 * Old engines (Chrome < 108, Safari < 15.4) have no dvh unit. design/tokens.css then falls back to `vh`, which on a
 * phone is the height WITH the address bar hidden. Here the same two custom properties follow the real window height
 * instead, so full-height screens end exactly at the bottom edge. Engines with dvh support never run this.
 */
export function supportsDynamicViewportUnits(): boolean {
  try {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('height', '1dvh')
  } catch {
    return true
  }
}

export function setupViewportUnit(): void {
  if (typeof window === 'undefined' || supportsDynamicViewportUnits()) return
  const root = document.documentElement
  const apply = () => {
    const h = window.innerHeight
    if (!h) return
    root.style.setProperty('--dvh', `${h / 100}px`)
    root.style.setProperty('--dvh100', `${h}px`)
  }
  apply()
  window.addEventListener('resize', apply, { passive: true })
  window.addEventListener('orientationchange', apply, { passive: true })
}
