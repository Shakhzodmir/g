import { motion } from 'motion/react'
import { useMotionPreset } from '../../design/motion'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Timer.module.css'
import { sectorAngle, sectorPath } from './timerLogic'

const C = 100
const FACE_R = 94
const SECTOR_R = 82
const TICKS = Array.from({ length: 12 }, (_, i) => i)

/** Visual timer: the coloured sector is the time that is left; it melts back towards 12 o'clock. */
export function Dial({ fraction, done, label }: { fraction: number; done: boolean; label: string }) {
  const preset = useMotionPreset()
  const d = sectorPath(sectorAngle(fraction), C, C, SECTOR_R)
  return (
    <div className={styles.dial} role="img" aria-label={label}>
      <svg viewBox="0 0 200 200" className={styles.svg} aria-hidden="true">
        <circle cx={C} cy={C} r={FACE_R} className={styles.face} />
        <circle cx={C} cy={C} r={SECTOR_R} className={styles.track} />
        {d && <path d={d} className={styles.sector} />}
        {TICKS.map((i) => {
          const a = (i * 30 * Math.PI) / 180
          const r1 = i % 3 === 0 ? FACE_R - 9 : FACE_R - 6
          return (
            <line
              key={i}
              x1={C + Math.sin(a) * r1}
              y1={C - Math.cos(a) * r1}
              x2={C + Math.sin(a) * (FACE_R - 2)}
              y2={C - Math.cos(a) * (FACE_R - 2)}
              className={styles.tick}
            />
          )
        })}
        <circle cx={C} cy={C} r={7} className={styles.hub} />
      </svg>
      {done && (
        <motion.span
          className={styles.doneMark}
          aria-hidden="true"
          initial={{ opacity: 0, scale: preset.movement ? 0.85 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <SymbolImg id="check_mark_button" />
        </motion.span>
      )}
    </div>
  )
}
