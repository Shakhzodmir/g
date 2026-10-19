import { LogOut, Maximize, Minimize, Moon, Sun } from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { speak } from '../audio/speech'
import { COMMON } from '../i18n/common'
import { useI18n, useStrings } from '../i18n'
import { shy } from '../lib/hyphenate'
import { useFocusHeading } from '../lib/useFocusHeading'
import { useDevice } from '../store/device'
import { sessionSensoryActive, setSessionSensory, useProfileStore } from '../store/profile'
import { BOARD_X } from '../features/board/strings'
import { Pressable } from '../ui/Pressable'
import { SymbolImg } from '../ui/SymbolImg'
import styles from './AppShell.module.css'
import { FEATURES } from './features'
import { BOARD, SHELL, SHELL_EXTRA } from './strings'
import { UnspokenOverlay } from './UnspokenOverlay'

interface NavItem {
  path: string
  symbol: string
  label: string
}

function useNavItems(): NavItem[] {
  const { ui } = useI18n()
  const t = useStrings(COMMON)
  const kind = useProfileStore((s) => s.profile.kind)
  const home = { path: '/', symbol: 'house', label: t('navHome') }
  const f = (id: keyof typeof FEATURES) => ({ path: FEATURES[id].path, symbol: FEATURES[id].symbol, label: ui(FEATURES[id].title) })
  return kind === 'adult' ? [home, f('aac'), f('schedule'), f('exercises')] : [home, f('aac'), f('schedule'), f('games'), f('exercises')]
}

/** Whole-page fullscreen state for the teacher rail. */
function useFullscreen(): { supported: boolean; on: boolean; toggle: () => void } {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  useEffect(() => {
    const h = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => undefined)
  }
  return { supported, on, toggle }
}

function RailButton({ label, icon, caption, pressed, onActivate }: { label: string; icon: ReactNode; caption: string; pressed?: boolean; onActivate: () => void }) {
  return (
    <Pressable className={styles.railBtn} label={label} pressed={pressed} onActivate={onActivate}>
      <span className={styles.railIcon} aria-hidden="true">
        {icon}
      </span>
      <span>{caption}</span>
    </Pressable>
  )
}

/** Teacher tools of board mode: fullscreen, quiet mode (this session only), exit. */
function TeacherRail() {
  const tb = useStrings(BOARD)
  const tx = useStrings(BOARD_X)
  const tc = useStrings(COMMON)
  const sensory = useProfileStore((s) => s.profile.sensory)
  const setBoard = useDevice((s) => s.setBoardMode)
  const dismissBoardHint = useDevice((s) => s.dismissBoardHint)
  const fs = useFullscreen()
  const quiet = sensory === 'calm'
  const toggleQuiet = () => {
    // Session-only: the saved level (e.g. «festive») is never overwritten and comes back on the second press.
    if (sessionSensoryActive()) setSessionSensory(null)
    else setSessionSensory(quiet ? 'normal' : 'calm')
  }
  const exit = () => {
    setSessionSensory(null)
    setBoard(false)
    dismissBoardHint()
  }
  return (
    <aside className={styles.teacher} aria-label={tb('teacher')} data-no-print>
      {fs.supported && (
        <RailButton
          label={fs.on ? tc('exitFullscreen') : tc('fullscreen')}
          icon={fs.on ? <Minimize /> : <Maximize />}
          caption={tc('fullscreen')}
          pressed={fs.on}
          onActivate={fs.toggle}
        />
      )}
      <RailButton label={tc('calm')} icon={quiet ? <Sun /> : <Moon />} caption={tc('calm')} pressed={quiet} onActivate={toggleQuiet} />
      <RailButton label={tb('exitBoard')} icon={<LogOut />} caption={tx('exitShort')} onActivate={exit} />
    </aside>
  )
}

export function AppShell() {
  const items = useNavItems()
  const t = useStrings(SHELL)
  const tx = useStrings(SHELL_EXTRA)
  const tc = useStrings(COMMON)
  const { uiLang } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const kind = useProfileStore((s) => s.profile.kind)
  const board = useDevice((s) => s.boardMode)
  const inParent = pathname.startsWith('/parent')
  const showBreak = kind === 'child' && !inParent && !pathname.startsWith('/calm')
  // The teacher's quiet mode lasts for the board session only (it ends when board mode ends, however that happens).
  useEffect(() => {
    if (!board) setSessionSensory(null)
  }, [board])
  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))

  // Move focus to the new screen's heading for screen-reader and keyboard users.
  useFocusHeading(pathname)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    // Board mode: <main> is the scroll container.
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [pathname])

  const mainRef = useRef<HTMLElement>(null)
  const needBreak = useCallback(() => {
    void speak({ key: 'p.need_break', text: { uz: 'Menga tanaffus kerak', ru: 'Мне нужен перерыв' } })
    navigate(FEATURES.calm.path)
  }, [navigate])

  // Alt+B: the Break button for keyboard users (works wherever the button is shown).
  useEffect(() => {
    if (!showBreak) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyB' || e.key.toLowerCase() === 'b')) {
        e.preventDefault()
        if (!e.repeat) needBreak()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showBreak, needBreak])

  return (
    <div className={styles.shell} data-kind={kind} data-board={board || undefined} data-break={showBreak || undefined}>
      <button
        type="button"
        className={`visually-hidden ${styles.skip}`}
        data-no-print
        onClick={() => {
          const m = mainRef.current
          if (!m) return
          m.focus()
          m.scrollIntoView?.({ block: 'start' })
        }}
      >
        {tx('skipToMain')}
      </button>

      {showBreak && (
        // First in the DOM (reached first by Tab and by switch scanning) but always drawn in the same corner.
        <Pressable className={styles.breakBtn} label={t('breakLabel')} data-no-print onActivate={needBreak} title="Alt+B">
          <span className={styles.breakIcon} aria-hidden="true">
            <SymbolImg id="calm" />
          </span>
          <span className={styles.breakLabel}>{t('breakButton')}</span>
        </Pressable>
      )}

      <nav className={styles.nav} aria-label={tc('appName')} data-no-print>
        <span className={styles.brand} aria-hidden="true">
          Gapimiz
        </span>
        <ul className={styles.navList}>
          {items.map((it) => (
            <li key={it.path}>
              <Pressable
                className={styles.navItem}
                label={it.label}
                aria-current={isActive(it.path) ? 'page' : undefined}
                onActivate={() => navigate(it.path)}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  <SymbolImg id={it.symbol} />
                </span>
                <span className={styles.navLabel}>{shy(it.label, uiLang === 'ru' ? 'ru' : 'uz', 6)}</span>
              </Pressable>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main} id="main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<div className={styles.loading} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>

      {board && <TeacherRail />}

      <UnspokenOverlay />
    </div>
  )
}
