import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMotionPreset } from '../design/motion'
import { COMMON } from '../i18n/common'
import { useStrings } from '../i18n'
import { Button } from './Button'
import styles from './Dialog.module.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 'center' dialog or 'sheet' anchored to the bottom on phones. */
  variant?: 'center' | 'sheet'
  footer?: ReactNode
  /** Hide the visible heading (it stays as the accessible name). */
  hideTitle?: boolean
  /** Hide the always-visible «Yopish / Закрыть» button (only for dialogs that must be answered). */
  hideClose?: boolean
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Number of dialogs currently open: while > 0 the app behind them is inert (no focus, no clicks, no reading). */
let openDialogs = 0
function appRoot(): HTMLElement | null {
  return document.getElementById('root')
}
function lockBackground(): () => void {
  openDialogs += 1
  appRoot()?.setAttribute('inert', '')
  let released = false
  return () => {
    if (released) return
    released = true
    openDialogs = Math.max(0, openDialogs - 1)
    if (openDialogs === 0) appRoot()?.removeAttribute('inert')
  }
}

export function Dialog({ open, onClose, title, children, variant = 'center', footer, hideTitle, hideClose }: DialogProps) {
  const t = useStrings(COMMON)
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const preset = useMotionPreset()
  // Parents re-render with a fresh onClose on every keystroke; the effect below must not re-run for that.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const pressStartedOnScrim = useRef(false)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const unlock = lockBackground()
    // Focus once, on open: the first control of the content (not the close button); never steal it back later.
    const t = setTimeout(() => {
      const p = panel.current
      if (!p || p.contains(document.activeElement)) return
      const items = Array.from(p.querySelectorAll<HTMLElement>(FOCUSABLE))
      ;(items.find((el) => !el.hasAttribute('data-dialog-close')) ?? items[0])?.focus()
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      unlock()
      if (prev && prev.isConnected) prev.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.scrim}
          data-sheet={variant === 'sheet' || undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={preset.dialog}
          // A stray press (finger dragged out of a text field, a tap that lands outside) must not throw away
          // unsaved text: close only when the press both started and ended on the scrim.
          onPointerDown={(e) => {
            pressStartedOnScrim.current = e.target === e.currentTarget
          }}
          onClick={(e) => {
            const intended = pressStartedOnScrim.current && e.target === e.currentTarget
            pressStartedOnScrim.current = false
            if (intended) onCloseRef.current()
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={[styles.panel, styles[variant]].join(' ')}
            data-surface=""
            initial={preset.movement ? { opacity: 0, y: 24 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={preset.movement ? { opacity: 0, y: 16 } : { opacity: 0 }}
            transition={preset.dialog}
          >
            <div className={styles.head}>
              <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.title}>
                {title}
              </h2>
              {!hideClose && (
                <Button variant="ghost" size="md" className={styles.close} icon={<X />} data-dialog-close="" onActivate={() => onCloseRef.current()}>
                  {t('close')}
                </Button>
              )}
            </div>
            <div className={styles.body}>{children}</div>
            {footer && <div className={styles.footer}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
