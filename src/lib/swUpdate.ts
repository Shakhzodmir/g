import { registerSW } from 'virtual:pwa-register'

const IDLE_MS = 15_000

/**
 * Non-disruptive PWA updates. A new service worker is downloaded in the background and waits; it is applied
 * (page reload) only when the user is idle on the Home screen with no dialog open, otherwise it simply takes
 * over at the next launch. The page never reloads in the middle of an activity.
 */
export function setupServiceWorker(): void {
  if (typeof window === 'undefined') return
  let update: ((reload?: boolean) => Promise<void>) | null = null
  let waiting = false
  let lastInput = Date.now()
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => (lastInput = Date.now()), { passive: true, capture: true })

  const onHome = () => ['', '#', '#/'].includes(location.hash)
  const tryApply = () => {
    if (!waiting || !update) return
    if (document.visibilityState !== 'visible' || !onHome()) return
    if (Date.now() - lastInput < IDLE_MS) return
    if (document.querySelector('[aria-modal="true"]')) return
    waiting = false
    void update(true)
  }
  setInterval(tryApply, 5000)

  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      waiting = true
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => void reg.update().catch(() => undefined)
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
    },
  })
}
