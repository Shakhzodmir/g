import { Delete, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { COMMON } from '../i18n/common'
import { useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { useProfileStore } from '../store/profile'
import { AdultZone } from './AdultZone'
import { Button } from './Button'
import { Dialog } from './Dialog'
import styles from './ParentGate.module.css'
import { hashPin, pinLockMs, verifyPin } from './pin'
import { UI } from './strings'

export { hashPin, verifyPin } from './pin'

const HOLD_MS = 1500

// Failed PINs are counted for the lifetime of the page (closing and reopening the gate does not reset them).
let pinFailures = 0
let pinLockedUntil = 0
/** For tests only. */
export function resetPinLock(): void {
  pinFailures = 0
  pinLockedUntil = 0
}

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['back', '0', 'done'],
] as const

/**
 * Adult gate: press and hold for 1.5 s (a child rarely does this by accident), then the optional PIN.
 * No arithmetic puzzles (WCAG 3.3.8) — adults with aphasia must be able to pass it too.
 * Assistive technology gets a hold-free path: a screen-reader click, Enter/Space, or — when switch scanning
 * is on — an explicit «Ochish / Открыть» button.
 */
export function ParentGate({ open, onUnlock, onCancel }: { open: boolean; onUnlock: () => void; onCancel: () => void }) {
  const t = useStrings(COMMON)
  const tu = useStrings(UI)
  const pinHash = useDevice((s) => s.parentPinHash)
  const setPinHash = useDevice((s) => s.setParentPinHash)
  const scanning = useProfileStore((s) => s.profile.scanning.mode !== 'off')
  const [stage, setStage] = useState<'hold' | 'pin'>('hold')
  const [progress, setProgress] = useState(0)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [waitS, setWaitS] = useState(0)
  const raf = useRef(0)
  const startedAt = useRef(0)
  const holding = useRef(false)
  const done = useRef(false)

  useEffect(() => {
    if (open) {
      setStage('hold')
      setProgress(0)
      setPin('')
      setError(false)
      done.current = false
    }
  }, [open])

  // Remaining lock time (after repeated wrong PINs) ticks down.
  useEffect(() => {
    if (stage !== 'pin') return
    const tick = () => setWaitS(Math.max(0, Math.ceil((pinLockedUntil - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [stage])

  const stop = useCallback(() => {
    holding.current = false
    cancelAnimationFrame(raf.current)
    raf.current = 0
    setProgress(0)
  }, [])

  const finishHold = useCallback(() => {
    if (done.current) return
    stop()
    if (pinHash) {
      setStage('pin')
      return
    }
    done.current = true
    onUnlock()
  }, [pinHash, onUnlock, stop])

  const startHold = (e: React.PointerEvent) => {
    // Only the first finger / the primary mouse button; a second touch must not start another loop.
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    cancelAnimationFrame(raf.current)
    holding.current = true
    startedAt.current = performance.now()
    const tick = () => {
      if (!holding.current) return
      const p = Math.min(1, (performance.now() - startedAt.current) / HOLD_MS)
      setProgress(p)
      if (p >= 1) {
        finishHold()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  // While a hold is running, ANY pointer going up or being cancelled (e.g. the second finger) ends it.
  useEffect(() => {
    if (!open) return
    const end = () => {
      if (holding.current) stop()
    }
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
    window.addEventListener('blur', end)
    return () => {
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
      window.removeEventListener('blur', end)
      stop()
    }
  }, [open, stop])

  const submitPin = async () => {
    if (!pinHash || Date.now() < pinLockedUntil || pin.length < 4) return
    const check = await verifyPin(pin, pinHash)
    if (check.ok) {
      pinFailures = 0
      pinLockedUntil = 0
      if (check.upgrade) setPinHash(await hashPin(pin))
      onUnlock()
      return
    }
    pinFailures += 1
    const lock = pinLockMs(pinFailures)
    if (lock > 0) pinLockedUntil = Date.now() + lock
    setWaitS(Math.ceil(lock / 1000))
    setError(true)
    setPin('')
  }

  const typeDigit = (d: string) => {
    setError(false)
    setPin((p) => (p.length < 6 ? p + d : p))
  }

  const backspace = () => {
    setError(false)
    setPin((p) => p.slice(0, -1))
  }

  const locked = waitS > 0

  return (
    <AdultZone>
      <Dialog open={open} onClose={onCancel} title={t('navParentsLong')} hideClose>
        {stage === 'hold' ? (
          <div className={styles.hold}>
            <p className={styles.hint}>{t('holdForAdults')}</p>
            <button
              type="button"
              className={styles.holdBtn}
              style={{ '--p': progress } as React.CSSProperties}
              aria-label={t('holdForAdults')}
              data-scan=""
              onPointerDown={startHold}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => {
                // Screen reader, Enter/Space and switch scanning all arrive as a click without a real pointer.
                if (e.detail === 0) finishHold()
              }}
            >
              <Lock aria-hidden="true" />
            </button>
            {scanning && (
              <Button variant="soft" size="lg" onActivate={finishHold}>
                {tu('openGate')}
              </Button>
            )}
            <Button variant="ghost" onActivate={onCancel}>
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <form
            className={styles.pin}
            onSubmit={(e) => {
              e.preventDefault()
              void submitPin()
            }}
          >
            <label className={styles.hint} htmlFor="gz-pin">
              {t('enterPin')}
            </label>
            <input
              id="gz-pin"
              className={styles.pinInput}
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setError(false)
                setPin(e.target.value.replace(/\D/g, ''))
              }}
              aria-invalid={error || undefined}
              aria-describedby="gz-pin-err"
              autoFocus
            />
            <p id="gz-pin-err" className={styles.error} role="status" aria-live="polite">
              {locked ? tu('pinWait', { n: waitS }) : error ? t('wrongPin') : ''}
            </p>
            <div className={styles.keypad} role="group" aria-label={tu('pinDigits')}>
              {KEYPAD.map((row, i) => (
                <div key={i} className={styles.keyRow}>
                  {row.map((k) =>
                    k === 'back' ? (
                      <Button key={k} variant="soft" iconOnly icon={<Delete />} label={tu('backspace')} scanGroup={`pin-${i}`} className={styles.key} onActivate={backspace}>
                        {tu('backspace')}
                      </Button>
                    ) : k === 'done' ? (
                      <Button key={k} scanGroup={`pin-${i}`} className={styles.key} onActivate={() => void submitPin()} disabled={pin.length < 4 || locked}>
                        {t('done')}
                      </Button>
                    ) : (
                      <Button key={k} variant="soft" scanGroup={`pin-${i}`} className={styles.key} onActivate={() => typeDigit(k)}>
                        {k}
                      </Button>
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className={styles.row}>
              <Button variant="ghost" onActivate={onCancel}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </AdultZone>
  )
}
