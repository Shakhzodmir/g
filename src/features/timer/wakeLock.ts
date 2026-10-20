import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
  addEventListener: (type: 'release', cb: () => void) => void
}

/**
 * Keeps the screen on while `active` (the visual timer is running on screen), so the dial never goes dark mid-countdown on
 * a classroom panel or a tablet. Released on pause, finish and when the screen is left; acquired again when the tab becomes
 * visible (the browser drops the lock whenever the page is hidden). Silently does nothing where the Wake Lock API is missing
 * (old WebViews, Safari < 16.4) or refused (battery saver).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
    if (!active || !wl) return
    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false
    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== 'visible') return
      try {
        const s = await wl.request('screen')
        if (cancelled) {
          void s.release().catch(() => undefined)
          return
        }
        sentinel = s
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null
        })
      } catch {
        /* refused: not worth bothering anyone */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      const s = sentinel
      sentinel = null
      if (s) void s.release().catch(() => undefined)
    }
  }, [active])
}
