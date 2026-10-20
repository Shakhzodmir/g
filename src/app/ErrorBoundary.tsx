import { Compass } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { renderBi } from '../i18n'
import { useDevice } from '../store/device'
import styles from './ErrorBoundary.module.css'
import { SHELL_EXTRA } from './strings'

const RELOAD_KEY = 'gapimiz.chunkReloads'

/** A lazy chunk that no longer exists (stale tab after a deploy), a blocked network request, or an offline miss. */
export function isChunkLoadError(error: unknown): boolean {
  const text = `${(error as Error | null)?.name ?? ''} ${(error as Error | null)?.message ?? ''}`
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS/i.test(text)
}

function getCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) ?? 0) || 0
  } catch {
    return 99
  }
}

/** Called once the app has been running fine for a while: a later chunk failure may reload again. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    /* ignore */
  }
}

async function purgeCaches(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* ignore */
  }
  try {
    const keys = (await globalThis.caches?.keys?.()) ?? []
    await Promise.all(keys.filter((k) => !k.startsWith('audio-clips')).map((k) => caches.delete(k)))
  } catch {
    /* ignore */
  }
}

/**
 * Recovery for failed chunk loads: reload once automatically; if that fails too, drop the service worker and
 * its precache and reload again; after that show the calm fallback screen. Returns true when a reload started.
 */
export function recoverFromChunkError(): boolean {
  const n = getCount()
  if (n >= 2) return false
  try {
    sessionStorage.setItem(RELOAD_KEY, String(n + 1))
  } catch {
    return false
  }
  if (n === 0) location.reload()
  else void purgeCaches().finally(() => location.reload())
  return true
}

function tr(key: keyof (typeof SHELL_EXTRA)['uz']): string {
  let lang: 'uz' | 'uzc' | 'ru' = 'uz'
  let script: 'latn' | 'cyrl' | 'latn2026' = 'latn'
  try {
    const d = useDevice.getState()
    lang = d.uiLang
    script = d.uzScript
  } catch {
    /* fall back to Uzbek */
  }
  // The error screen follows the chosen script too (Cyrillic, 2026 Latin), not only the language.
  return renderBi({ uz: SHELL_EXTRA.uz[key], ru: SHELL_EXTRA.ru[key] }, lang, lang === 'uzc' ? 'cyrl' : script)
}

/** Clears every gapimiz.* localStorage key (device + preferences). IndexedDB (cards, recordings, profiles) is untouched. */
export function resetLocalSettings(): void {
  try {
    const drop: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('gapimiz.')) drop.push(k)
    }
    drop.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

interface State {
  error: Error | null
  asking: boolean
  attempt: number
}

/** Top-level safety net: a render error or failed lazy chunk shows a calm screen instead of a white page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, asking: false, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error) && recoverFromChunkError()) return
    console.error('Gapimiz render error', error, info.componentStack)
  }

  private goHome = () => {
    location.hash = '#/'
    this.setState((s) => ({ error: null, asking: false, attempt: s.attempt + 1 }))
  }

  render(): ReactNode {
    const { error, asking, attempt } = this.state
    if (!error) return <div key={attempt} style={{ display: 'contents' }}>{this.props.children}</div>
    // While an automatic reload is under way keep the screen quiet instead of flashing the fallback.
    if (isChunkLoadError(error) && getCount() === 1) return <div className={styles.screen} aria-busy="true" />
    return (
      <div className={styles.screen} role="alert">
        <div className={styles.symbol} aria-hidden="true">
          <Compass />
        </div>
        <h1 className={styles.title}>{tr('errTitle')}</h1>
        <p className={styles.text}>{tr('errText')}</p>
        <div className={styles.buttons}>
          <button type="button" className={styles.primary} onClick={this.goHome}>
            {tr('errHome')}
          </button>
          <button type="button" className={styles.secondary} onClick={() => location.reload()}>
            {tr('errReload')}
          </button>
        </div>
        {asking ? (
          <div className={styles.confirm} role="group" aria-label={tr('errReset')}>
            <p>{tr('errResetAsk')}</p>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  resetLocalSettings()
                  location.hash = '#/'
                  location.reload()
                }}
              >
                {tr('errResetYes')}
              </button>
              <button type="button" className={styles.ghost} onClick={() => this.setState({ asking: false })}>
                {tr('errResetNo')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.ghost} onClick={() => this.setState({ asking: true })}>
            {tr('errReset')}
          </button>
        )}
      </div>
    )
  }
}
