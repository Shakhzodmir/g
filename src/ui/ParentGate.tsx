import { Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { COMMON } from '../i18n/common'
import { useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { Button } from './Button'
import { Dialog } from './Dialog'
import styles from './ParentGate.module.css'

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`gapimiz:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

const HOLD_MS = 3000

/**
 * Adult gate: press and hold for 3 s (children rarely do this by accident), then the optional PIN.
 * No arithmetic puzzles (WCAG 3.3.8) — adults with aphasia must be able to pass it too.
 */
export function ParentGate({ open, onUnlock, onCancel }: { open: boolean; onUnlock: () => void; onCancel: () => void }) {
  const t = useStrings(COMMON)
  const pinHash = useDevice((s) => s.parentPinHash)
  const [stage, setStage] = useState<'hold' | 'pin'>('hold')
  const [progress, setProgress] = useState(0)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const raf = useRef(0)
  const startedAt = useRef(0)

  useEffect(() => {
    if (open) {
      setStage('hold')
      setProgress(0)
      setPin('')
      setError(false)
    }
  }, [open])

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setProgress(0)
  }, [])

  const finishHold = useCallback(() => {
    if (pinHash) setStage('pin')
    else onUnlock()
  }, [pinHash, onUnlock])

  const startHold = () => {
    startedAt.current = performance.now()
    const tick = () => {
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

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const submitPin = async () => {
    if (!pinHash) return
    if ((await hashPin(pin)) === pinHash) onUnlock()
    else {
      setError(true)
      setPin('')
    }
  }

  return (
    <Dialog open={open} onClose={onCancel} title={t('navParentsLong')}>
      {stage === 'hold' ? (
        <div className={styles.hold}>
          <p className={styles.hint}>{t('holdForAdults')}</p>
          <button
            type="button"
            className={styles.holdBtn}
            style={{ '--p': progress } as React.CSSProperties}
            aria-label={t('holdForAdults')}
            onPointerDown={startHold}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onKeyDown={(e) => {
              // Keyboard / switch users: Enter or Space confirms without a hold.
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                finishHold()
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Lock aria-hidden="true" />
          </button>
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
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            aria-invalid={error || undefined}
            aria-describedby={error ? 'gz-pin-err' : undefined}
            autoFocus
          />
          {error && (
            <p id="gz-pin-err" className={styles.error}>
              {t('wrongPin')}
            </p>
          )}
          <div className={styles.row}>
            <Button variant="ghost" onActivate={onCancel}>
              {t('cancel')}
            </Button>
            <Button onActivate={() => void submitPin()} disabled={pin.length < 4}>
              {t('done')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
