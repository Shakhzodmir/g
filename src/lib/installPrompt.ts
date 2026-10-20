import { create } from 'zustand'

/** The (non-standard, Chromium) install prompt event; kept until the adult presses "Install". */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** A browser install prompt is available (Chrome / Edge / Samsung Internet on Android and desktop). */
  canPrompt: boolean
  /** Running as an installed app already. */
  installed: boolean
}

export const useInstall = create<InstallState>()(() => ({ canPrompt: false, installed: false }))

let deferred: BeforeInstallPromptEvent | null = null

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** iPhone / iPad Safari has no install prompt: the adult has to use Share > Add to Home Screen. */
export const isIosBrowser = (ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints): boolean =>
  /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)

/** Listens as early as possible (the event fires once, soon after load). Called from main.tsx. */
export function setupInstallPrompt(): void {
  if (typeof window === 'undefined') return
  useInstall.setState({ installed: isStandalone() })
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    useInstall.setState({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    useInstall.setState({ canPrompt: false, installed: true })
  })
}

/** Shows the browser's install dialog; resolves true when accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const ev = deferred
  deferred = null
  useInstall.setState({ canPrompt: false })
  try {
    await ev.prompt()
    return (await ev.userChoice).outcome === 'accepted'
  } catch {
    return false
  }
}
