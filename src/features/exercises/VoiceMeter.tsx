import { Ear } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStrings } from '../../i18n'
import { effectiveSensory } from '../../lib/sensory'
import { useProfileStore } from '../../store/profile'
import styles from './exercises.module.css'
import { createMeterSmoother, meterProfile, stepsToPercent, toSteps } from './sensors/meterLevel'
import { S } from './strings'

export interface VoiceMeterProps {
  /** The raw level 0..1 right now (read from a ref every frame; the meter smooths it itself). */
  read: () => number
  /** True while the microphone is delivering sound. When it turns false the bar falls back to empty. */
  active: boolean
}

/**
 * "We hear you": a large, calm level bar for the microphone exercises. Text-free for non-readers (an ear and a row of
 * segments that fill from the left), a real `role="meter"` for assistive technology. It never flashes: the level
 * rises quickly, falls slowly, and a silence floor keeps the room's hum off the bar. With reduced motion or the
 * calm sensory level it uses fewer, coarser segments and no easing at all.
 */
export function VoiceMeter({ read, active }: VoiceMeterProps) {
  const t = useStrings(S)
  const sensory = useProfileStore((s) => s.profile.sensory)
  const mode = effectiveSensory(sensory)
  const prof = useMemo(() => meterProfile(mode), [mode])
  const [filled, setFilled] = useState(0)
  const readRef = useRef(read)
  useEffect(() => {
    readRef.current = read
  })

  useEffect(() => {
    if (!active) {
      setFilled(0)
      return
    }
    const smoother = createMeterSmoother(prof.smoother)
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - last))
      last = now
      const next = toSteps(smoother.update(readRef.current(), dt), prof.steps)
      setFilled((f) => (f === next ? f : next))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, prof])

  const shown = active ? Math.min(filled, prof.steps) : 0
  return (
    <div className={styles.voiceMeter} data-heard={shown > 0 || undefined} data-animate={prof.animate || undefined}>
      <span className={styles.vmEar} aria-hidden="true">
        <Ear />
      </span>
      <div
        className={styles.vmTrack}
        role="meter"
        aria-label={t('meterLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stepsToPercent(shown, prof.steps)}
        aria-valuetext={shown > 0 ? t('meterHeard') : t('meterQuiet')}
        style={{ gridTemplateColumns: `repeat(${prof.steps}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: prof.steps }, (_, i) => (
          <span key={i} className={styles.vmSeg} data-on={i < shown || undefined} />
        ))}
      </div>
    </div>
  )
}
