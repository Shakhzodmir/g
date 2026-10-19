import { Moon, Sun } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { speak } from '../audio/speech'
import { COMMON } from '../i18n/common'
import { useI18n, useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { Button } from '../ui/Button'
import { FullscreenButton } from '../ui/misc'
import { Pressable } from '../ui/Pressable'
import { SymbolImg } from '../ui/SymbolImg'
import styles from './AppShell.module.css'
import { FEATURES } from './features'
import { BOARD, SHELL } from './strings'
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

export function AppShell() {
  const items = useNavItems()
  const t = useStrings(SHELL)
  const tb = useStrings(BOARD)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const kind = useProfileStore((s) => s.profile.kind)
  const sensory = useProfileStore((s) => s.profile.sensory)
  const update = useProfileStore((s) => s.update)
  const board = useDevice((s) => s.boardMode)
  const setBoard = useDevice((s) => s.setBoardMode)
  const inParent = pathname.startsWith('/parent')
  const showBreak = kind === 'child' && !inParent && !pathname.startsWith('/calm')
  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))

  // Move focus to the new screen's heading for screen-reader and keyboard users.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    const h = document.querySelector<HTMLElement>('main h1')
    if (h) {
      h.tabIndex = -1
      h.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className={styles.shell} data-kind={kind} data-board={board || undefined} data-break={showBreak || undefined}>
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
                <span className={styles.navLabel}>{it.label}</span>
              </Pressable>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main} id="main">
        <Suspense fallback={<div className={styles.loading} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>

      {showBreak && (
        <Pressable
          className={styles.breakBtn}
          label={t('breakLabel')}
          data-no-print
          onActivate={() => {
            void speak({ key: 'p.need_break', text: { uz: 'Menga tanaffus kerak', ru: 'Мне нужен перерыв' } })
            navigate(FEATURES.calm.path)
          }}
        >
          <span className={styles.breakIcon} aria-hidden="true">
            <SymbolImg id="calm" />
          </span>
          <span>{t('breakButton')}</span>
        </Pressable>
      )}

      {board && (
        <aside className={styles.teacher} aria-label={tb('teacher')} data-no-print>
          <FullscreenButton />
          <Button
            variant="soft"
            iconOnly
            icon={sensory === 'calm' ? <Sun /> : <Moon />}
            label={tc('calm')}
            pressed={sensory === 'calm'}
            onActivate={() => void update({ sensory: sensory === 'calm' ? 'normal' : 'calm' })}
          >
            {tc('calm')}
          </Button>
          <Button variant="soft" onActivate={() => setBoard(false)}>
            {tb('exitBoard')}
          </Button>
        </aside>
      )}

      <UnspokenOverlay />
    </div>
  )
}
