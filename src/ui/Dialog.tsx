import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMotionPreset } from '../design/motion'
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
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, onClose, title, children, variant = 'center', footer, hideTitle }: DialogProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const preset = useMotionPreset()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
      prev?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.scrim}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={preset.dialog}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose()
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
            <h2 id={titleId} className={hideTitle ? 'visually-hidden' : styles.title}>
              {title}
            </h2>
            <div className={styles.body}>{children}</div>
            {footer && <div className={styles.footer}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
