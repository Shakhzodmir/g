import { Hand, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Pressable } from '../../ui/Pressable'
import { useAdultUnlock } from '../schedule/useAdultUnlock'
import styles from './exercises.module.css'
import { S } from './strings'

/**
 * Press-and-hold fallback when there is no microphone: holding works exactly like blowing / voice.
 * Keyboard: Space/Enter held down = held. Switch scanning (a single click) = a 1.5 s "hold".
 *
 * "Held" = at least one finger is down (every pointer id is tracked, so with two fingers it stays held until the
 * LAST one lifts) or a key is down or a switch pulse is running. Anything that takes the hold away from the
 * control — focus moving elsewhere, the window losing focus, the page being hidden, the browser cancelling the
 * touch or capture — releases it, so it can never stay "stuck" on.
 */
export function HoldButton({ onHoldChange, label }: { onHoldChange: (held: boolean) => void; label?: string }) {
  const tc = useStrings(COMMON)
  const text = label ?? tc('holdButton')
  const [held, setHeld] = useState(false)
  const heldRef = useRef(false)
  const lastRelease = useRef(0)
  const pointers = useRef(new Set<number>())
  const keyDown = useRef(false)
  const pulsing = useRef(false)
  const pulse = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cb = useRef(onHoldChange)
  useEffect(() => {
    cb.current = onHoldChange
  }, [onHoldChange])

  /** Recomputes "held" from every source and reports a change. */
  const sync = useCallback(() => {
    const want = pointers.current.size > 0 || keyDown.current || pulsing.current
    if (want === heldRef.current) return
    heldRef.current = want
    setHeld(want)
    cb.current(want)
    if (!want) lastRelease.current = Date.now()
  }, [])

  const releaseAll = useCallback(() => {
    pointers.current.clear()
    keyDown.current = false
    pulsing.current = false
    if (pulse.current) clearTimeout(pulse.current)
    pulse.current = null
    sync()
  }, [sync])

  // The hold must not survive the window or the page losing the user.
  useEffect(() => {
    const onVis = () => document.hidden && releaseAll()
    window.addEventListener('blur', releaseAll)
    window.addEventListener('pagehide', releaseAll)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', releaseAll)
      window.removeEventListener('pagehide', releaseAll)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [releaseAll])

  useEffect(
    () => () => {
      if (pulse.current) clearTimeout(pulse.current)
      if (heldRef.current) {
        heldRef.current = false
        cb.current(false)
      }
    },
    [],
  )

  const up = (id: number) => {
    pointers.current.delete(id)
    sync()
  }

  return (
    <Pressable
      className={styles.holdBtn}
      data-held={held || undefined}
      label={text}
      touch={{ activateOnRelease: true, holdMs: 0, ignoreRepeatMs: 0, dwellMs: 0 }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* not supported */
        }
        if (pulse.current) clearTimeout(pulse.current)
        pulsing.current = false
        pointers.current.add(e.pointerId)
        sync()
      }}
      onPointerUp={(e) => up(e.pointerId)}
      onPointerLeave={(e) => up(e.pointerId)}
      onLostPointerCapture={(e) => up(e.pointerId)}
      onBlur={releaseAll}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !keyDown.current) {
          keyDown.current = true
          sync()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          keyDown.current = false
          sync()
        }
      }}
      onActivate={() => {
        // Clicks that end a pointer or key hold are already handled.
        if (keyDown.current || heldRef.current || pointers.current.size > 0 || Date.now() - lastRelease.current < 700) return
        pulsing.current = true
        sync()
        pulse.current = setTimeout(() => {
          pulsing.current = false
          sync()
        }, 1500)
      }}
    >
      <Hand aria-hidden="true" className={styles.holdIcon} />
      <span>{text}</span>
    </Pressable>
  )
}

/**
 * Gear button in the header that opens adult-only sensor settings. On a child profile it goes through the
 * hold-1.5-seconds adult gate first (the settings change what the game counts, a child must not wander into them).
 * `children` may be a function receiving `close`, so an action inside the sheet can close it.
 */
export function AdultSettings({ children }: { children: ReactNode | ((close: () => void) => ReactNode) }) {
  const t = useStrings(S)
  const [open, setOpen] = useState(false)
  const { requestUnlock, gate } = useAdultUnlock()
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <Button variant="soft" iconOnly icon={<SlidersHorizontal />} label={t('adultSettings')} onActivate={() => requestUnlock(() => setOpen(true))}>
        {t('adultSettings')}
      </Button>
      {gate}
      <Dialog open={open} onClose={close} title={t('adultSettings')} variant="sheet">
        <div className={styles.settings}>{typeof children === 'function' ? children(close) : children}</div>
      </Dialog>
    </>
  )
}

/** True once `active` has stayed true for `ms` (resets when it turns false). */
export function useAfter(active: boolean, ms: number): boolean {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) {
      setDone(false)
      return
    }
    const id = setTimeout(() => setDone(true), ms)
    return () => clearTimeout(id)
  }, [active, ms])
  return done
}

/** How long the microphone permission may stay pending before the way out appears. */
export const ASKING_ESCAPE_MS = 8000

/**
 * "Waiting for permission" / "listening to the room" overlay. When the permission prompt never answers (hidden
 * by the browser, ignored), after a few seconds the overlay offers to go on without a microphone, or to cancel.
 */
export function MicOverlay({ status, onNoMic, onCancel }: { status: 'asking' | 'calibrating'; onNoMic: () => void; onCancel: () => void }) {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const slow = useAfter(status === 'asking', ASKING_ESCAPE_MS)
  return (
    <div className={styles.overlay}>
      <p className={styles.overlayText} role="status">
        {status === 'asking' ? t('asking') : t('calibrating')}
      </p>
      {status === 'calibrating' && <span className={styles.calBar} aria-hidden="true" />}
      {status === 'asking' && slow && (
        <>
          <p className={styles.adultNote} role="status">
            {t('askingSlow')}
          </p>
          <div className={styles.startButtons}>
            <Button size="lg" icon={<Hand />} onActivate={onNoMic}>
              {t('withoutMic')}
            </Button>
            <Button size="lg" variant="ghost" onActivate={onCancel}>
              {tc('cancel')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/** Small ring that fills while a pose / blow is held. */
export function ProgressRing({ value, size = 64, children }: { value: number; size?: number; children?: ReactNode }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <span className={styles.ring} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle cx="32" cy="32" r={r} className={styles.ringTrack} />
        <circle
          cx="32"
          cy="32"
          r={r}
          className={styles.ringFill}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          transform="rotate(-90 32 32)"
        />
      </svg>
      {children && <span className={styles.ringInner}>{children}</span>}
    </span>
  )
}
