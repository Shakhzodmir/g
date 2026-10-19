import { Hand, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Pressable } from '../../ui/Pressable'
import styles from './exercises.module.css'
import { S } from './strings'

/**
 * Press-and-hold fallback when there is no microphone: holding works exactly like blowing / voice.
 * Keyboard: Space/Enter held down = held. Switch scanning (a single click) = a 1.5 s "hold".
 */
export function HoldButton({ onHoldChange, label }: { onHoldChange: (held: boolean) => void; label?: string }) {
  const tc = useStrings(COMMON)
  const text = label ?? tc('holdButton')
  const [held, setHeld] = useState(false)
  const lastRelease = useRef(0)
  const keyDown = useRef(false)
  const pulse = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cb = useRef(onHoldChange)
  useEffect(() => {
    cb.current = onHoldChange
  }, [onHoldChange])

  const set = useCallback((v: boolean) => {
    setHeld(v)
    cb.current(v)
    if (!v) lastRelease.current = Date.now()
  }, [])

  useEffect(
    () => () => {
      if (pulse.current) clearTimeout(pulse.current)
      cb.current(false)
    },
    [],
  )

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
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerLeave={() => held && set(false)}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !keyDown.current) {
          keyDown.current = true
          set(true)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          keyDown.current = false
          set(false)
        }
      }}
      onActivate={() => {
        // Clicks that end a pointer or key hold are already handled.
        if (keyDown.current || held || Date.now() - lastRelease.current < 700) return
        set(true)
        pulse.current = setTimeout(() => set(false), 1500)
      }}
    >
      <Hand aria-hidden="true" className={styles.holdIcon} />
      <span>{text}</span>
    </Pressable>
  )
}

/** Gear button in the header that opens adult-only sensor settings. */
export function AdultSettings({ children }: { children: ReactNode }) {
  const t = useStrings(S)
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="soft" iconOnly icon={<SlidersHorizontal />} label={t('adultSettings')} onActivate={() => setOpen(true)}>
        {t('adultSettings')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('adultSettings')} variant="sheet">
        <div className={styles.settings}>{children}</div>
      </Dialog>
    </>
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

/** Tiny live level meter so the adult can see the microphone hears something. */
export function LevelMeter({ value, label }: { value: number; label: string }) {
  return (
    <span className={styles.meter} role="img" aria-label={label}>
      <span className={styles.meterFill} style={{ transform: `scaleX(${Math.min(1, Math.max(0, value))})` }} />
    </span>
  )
}
