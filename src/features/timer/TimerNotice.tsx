import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useMotionPreset } from '../../design/motion'
import { useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import { Button } from '../../ui/Button'
import { X } from 'lucide-react'
import { Dial } from './Dial'
import { useTimer } from './store'
import { S } from './strings'
import styles from './Timer.module.css'
import { dismissLiveToast, getLiveToast, subscribeLiveToast } from './watcher'

/** Toast stays long enough to be seen, short enough not to nag. */
const TOAST_MS = 12_000

/**
 * "Vaqt tugadi / Время закончилось": a calm card with the finished dial. Shown (a) as a toast when the end
 * arrives while the page is in view, and (b) as a quiet card on the next open when the timer ended while the
 * page was closed or hidden. No sound of its own; tap the cross to close.
 */
export function TimerNotice() {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const preset = useMotionPreset()
  const { notice, dismissNotice } = useTimer()
  const [toast, setToast] = useState(getLiveToast())
  useEffect(() => subscribeLiveToast(setToast), [])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(dismissLiveToast, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])

  // A quiet card only makes sense while the page is actually visible.
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const on = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  const show = !!toast || (notice !== null && visible)
  const close = () => {
    dismissLiveToast()
    dismissNotice()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.notice}
          role="status"
          aria-live="polite"
          data-no-print
          data-timer-notice=""
          initial={{ opacity: 0, y: preset.movement ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={preset.dialog}
        >
          <span className={styles.noticeDial} aria-hidden="true">
            <Dial fraction={0} done label="" size="100%" />
          </span>
          <p className={styles.noticeText}>{t('timeUp')}</p>
          <Button variant="ghost" iconOnly icon={<X />} label={tc('close')} onActivate={close}>
            {tc('close')}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

let mounted = false

/** Mounts the notice in its own React root so it appears on every screen without touching the app shell. */
export function mountTimerNotice(): void {
  if (mounted || typeof document === 'undefined') return
  mounted = true
  const host = document.createElement('div')
  host.id = 'gz-timer-notice'
  document.body.appendChild(host)
  createRoot(host).render(<TimerNotice />)
}
