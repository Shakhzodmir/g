import { Lock } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { AdultZone } from '../../ui/AdultZone'
import { Button } from '../../ui/Button'
import { PageHeader } from '../../ui/PageHeader'
import { ParentGate } from '../../ui/ParentGate'
import About from './About'
import Cards from './Cards'
import Data from './Data'
import ParentHome from './ParentHome'
import styles from './parent.module.css'
import Print from './Print'
import Profiles from './Profiles'
import Progress from './ProgressScreen'
import Settings from './Settings'
import { useT } from './shared'
import Tips from './Tips'
import { isParentUnlocked, lockParent, markParentUnlocked, touchParent, trustedEntry } from './unlock'

// Nutq tekshiruvi / Проверка речи: a screen of its own, loaded when opened.
const Check = lazy(() => import('../check'))
// Qayerga murojaat qilish / Куда обратиться (and the family's contact book): loaded when opened.
const Help = lazy(() => import('../help'))

/** How often the idle timeout is checked. */
const IDLE_CHECK_MS = 15_000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const

/** Visible "the adult area is open" indicator with the one-tap way to close it again. */
function LockBar({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div className={styles.lockBar} data-no-print>
      <span className={styles.lockInfo} role="status">
        <Lock aria-hidden="true" />
        {t('lockOpen')}
      </span>
      <Button variant="soft" icon={<Lock />} onActivate={onClose}>
        {t('lockClose')}
      </Button>
    </div>
  )
}

/** "Ota-onalar va mutaxassislar uchun / Родителям и специалистам" — the adult area behind the ParentGate. */
export default function ParentArea() {
  const location = useLocation()
  const navigate = useNavigate()
  const tc = useStrings(COMMON)
  const [open, setOpen] = useState(() => trustedEntry(location, import.meta.env.DEV))

  // While open: keep the unlock alive on interaction, drop it on idle, and ALWAYS drop it when the area
  // unmounts (the user left the /parent tree) or is closed.
  useEffect(() => {
    if (!open) return
    markParentUnlocked()
    const onActivity = () => touchParent()
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { capture: true, passive: true })
    const iv = setInterval(() => {
      if (!isParentUnlocked()) setOpen(false)
    }, IDLE_CHECK_MS)
    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, { capture: true })
      clearInterval(iv)
      lockParent()
    }
  }, [open])

  const closeArea = () => {
    lockParent()
    setOpen(false)
    navigate('/', { replace: true })
  }

  if (!open) {
    // Opened directly (bookmark, typed link, Back) or expired: pass the gate in this session first.
    return (
      <AdultZone>
        <div className={styles.area}>
          <PageHeader title={tc('navParentsLong')} />
          <ParentGate open onUnlock={() => setOpen(true)} onCancel={() => navigate('/', { replace: true })} />
        </div>
      </AdultZone>
    )
  }

  // The whole adult area ignores touch accommodations (hold, dwell, repeat guard): they would make it unusable.
  return (
    <AdultZone>
      <div className={styles.area}>
        <LockBar onClose={closeArea} />
        <Routes>
          <Route index element={<ParentHome />} />
          <Route path="progress" element={<Progress />} />
          <Route path="tips" element={<Tips />} />
          <Route path="cards" element={<Cards />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="settings" element={<Settings />} />
          <Route path="data" element={<Data />} />
          <Route path="print" element={<Print />} />
          <Route path="about" element={<About />} />
          <Route
            path="check/*"
            element={
              <Suspense fallback={null}>
                <Check />
              </Suspense>
            }
          />
          <Route
            path="help"
            element={
              <Suspense fallback={null}>
                <Help />
              </Suspense>
            }
          />
          <Route path="*" element={<ParentHome />} />
        </Routes>
      </div>
    </AdultZone>
  )
}
