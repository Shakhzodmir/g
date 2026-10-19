import type { CSSProperties } from 'react'
import type { BlowScene } from '../settings'
import styles from './scenes.module.css'

export interface SceneProps {
  /** 0..1 how far the scene has gone (candles out, seeds flown, boat sailed). */
  progress: number
  blowing: boolean
  /** 0..1 blow strength. */
  strength: number
  /** Moving elements allowed (otherwise fades only). */
  movement: boolean
  className?: string
}

/** Soft air lines from the left: visible only while a blow is happening. */
function Wind({ strength, blowing }: { strength: number; blowing: boolean }) {
  return (
    <g className={styles.wind} style={{ opacity: blowing ? 0.35 + 0.55 * strength : 0 }}>
      <path d="M8 96 q30 -10 58 0 t58 0" />
      <path d="M2 128 q34 -12 66 0 t60 0" />
      <path d="M12 160 q28 -9 54 0 t52 0" />
    </g>
  )
}

const CANDLES = 5
const CANDLE_FILLS = ['var(--fitz-describe-bg)', 'var(--fitz-action-bg)', 'var(--fitz-question-bg)', 'var(--fitz-social-bg)', 'var(--fitz-people-bg)']
const CANDLE_RIMS = ['var(--fitz-describe-border)', 'var(--fitz-action-border)', 'var(--fitz-question-border)', 'var(--fitz-social-border)', 'var(--fitz-people-border)']

/** Birthday cake: candles go out one by one, left to right. */
export function Candles({ progress, blowing, strength, movement, className }: SceneProps) {
  const out = Math.min(CANDLES, Math.floor(progress * CANDLES + 1e-6))
  return (
    <svg viewBox="0 0 360 260" className={[styles.scene, className].filter(Boolean).join(' ')} aria-hidden="true">
      <Wind strength={strength} blowing={blowing} />
      <ellipse cx="190" cy="236" rx="150" ry="14" className={styles.plate} />
      <rect x="70" y="146" width="240" height="88" rx="20" className={styles.cake} />
      <path
        d="M70 166 Q70 146 90 146 H290 Q310 146 310 166 V172 q-12 12 -24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 t-24 0 Z"
        className={styles.frosting}
      />
      {Array.from({ length: CANDLES }, (_, i) => {
        const x = 100 + i * 45
        const lit = i >= out
        const active = i === out && blowing
        const lean = active ? strength : 0
        return (
          <g key={i}>
            <rect x={x - 8} y="92" width="16" height="54" rx="6" fill={CANDLE_FILLS[i]} stroke={CANDLE_RIMS[i]} strokeWidth="2.5" />
            <line x1={x} y1="92" x2={x} y2="82" className={styles.wick} />
            <g
              className={styles.flame}
              style={
                {
                  opacity: lit ? 1 : 0,
                  transformOrigin: `${x}px 82px`,
                  transform: `rotate(${-lean * 28}deg) scaleY(${1 - lean * 0.3})`,
                } as CSSProperties
              }
            >
              <path d={`M${x} 50 C${x + 13} 64 ${x + 12} 82 ${x} 82 C${x - 12} 82 ${x - 13} 64 ${x} 50 Z`} className={styles.flameOuter} />
              <path d={`M${x} 63 C${x + 6} 70 ${x + 6} 80 ${x} 80 C${x - 6} 80 ${x - 6} 70 ${x} 63 Z`} className={styles.flameInner} />
            </g>
            {!lit && movement && <path d={`M${x} 78 q-6 -10 0 -18 t0 -18`} className={styles.smoke} />}
          </g>
        )
      })}
    </svg>
  )
}

const SEEDS = 14
const SEED_LIST = Array.from({ length: SEEDS }, (_, i) => {
  const a = (i / SEEDS) * Math.PI * 2 - Math.PI / 2
  return { i, a, dx: Math.cos(a), dy: Math.sin(a) }
})
// The wind comes from the left, so the seeds on the right fly first.
const SEED_ORDER = [...SEED_LIST].sort((p, q) => q.dx - p.dx)

/** Dandelion: seeds detach and drift away to the right. */
export function Dandelion({ progress, blowing, strength, movement, className }: SceneProps) {
  const flown = Math.min(SEEDS, Math.floor(progress * SEEDS + 1e-6))
  const gone = new Set(SEED_ORDER.slice(0, flown).map((s) => s.i))
  const cx = 150
  const cy = 112
  const sway = blowing ? strength * 6 : 0
  return (
    <svg viewBox="0 0 360 260" className={[styles.scene, className].filter(Boolean).join(' ')} aria-hidden="true">
      <Wind strength={strength} blowing={blowing} />
      <ellipse cx="160" cy="250" rx="140" ry="16" className={styles.grass} />
      <path d={`M${cx} 252 C${cx - 6} 210 ${cx + 6} 160 ${cx} ${cy}`} className={styles.stem} />
      <path d={`M${cx} 236 c-30 -6 -48 -22 -56 -40 c24 4 44 16 56 34z`} className={styles.leaf} />
      <path d={`M${cx} 228 c26 -8 40 -24 46 -42 c-22 6 -38 20 -46 38z`} className={styles.leaf} />
      <g className={styles.head} style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${sway}deg)` } as CSSProperties}>
        {SEED_LIST.map((s) => {
          const tipX = cx + s.dx * 50
          const tipY = cy + s.dy * 50
          const isGone = gone.has(s.i)
          const k = (s.i % 4) + 1
          const fly: CSSProperties = isGone
            ? movement
              ? { transform: `translate(${120 + k * 28}px, ${-40 - (s.i % 3) * 30}px) rotate(${30 + k * 15}deg)`, opacity: 0 }
              : { opacity: 0 }
            : {}
          return (
            <g key={s.i} className={movement ? styles.seed : styles.seedFade} style={{ ...fly, transformOrigin: `${tipX}px ${tipY}px` }}>
              <line x1={cx + s.dx * 10} y1={cy + s.dy * 10} x2={tipX} y2={tipY} className={styles.seedStalk} />
              <circle cx={tipX} cy={tipY} r="8" className={styles.pappus} />
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="11" className={styles.headCore} />
      </g>
    </svg>
  )
}

/** Small boat: sails from the left shore to the island. */
export function Boat({ progress, blowing, strength, movement, className }: SceneProps) {
  const x = 10 + Math.min(1, progress) * 175
  const arrived = progress >= 1
  const bulge = blowing ? 1 + strength * 0.3 : 1
  const tilt = blowing && movement ? -2 - strength * 3 : 0
  return (
    <svg viewBox="0 0 360 260" className={[styles.scene, className].filter(Boolean).join(' ')} aria-hidden="true">
      <circle cx="300" cy="46" r="22" className={styles.sun} />
      <Wind strength={strength} blowing={blowing} />
      <ellipse cx="322" cy="204" rx="46" ry="20" className={styles.island} />
      <line x1="320" y1="190" x2="320" y2="140" className={styles.mast} />
      <path d="M320 142 l26 10 l-26 10z" className={styles.flag} style={{ opacity: arrived ? 1 : 0.25 }} />
      <rect x="0" y="200" width="360" height="60" className={styles.water} />
      <path d="M0 202 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" className={styles.wave} />
      <g
        className={movement ? styles.boatMove : styles.boatFade}
        style={{ transform: `translate(${x}px, 0px) rotate(${tilt}deg)`, transformOrigin: `${x + 50}px 200px` } as CSSProperties}
      >
        <path d="M6 186 h92 l-16 24 h-60z" className={styles.hull} />
        <line x1="52" y1="186" x2="52" y2="110" className={styles.mast} />
        <path d="M54 114 L54 180 L96 180 Z" className={styles.sail} style={{ transformOrigin: '54px 150px', transform: `scaleX(${bulge})` }} />
        <path d="M50 124 L50 180 L18 180 Z" className={styles.sail2} />
      </g>
    </svg>
  )
}

export const SCENES: Record<BlowScene, (p: SceneProps) => React.JSX.Element> = { candles: Candles, dandelion: Dandelion, boat: Boat }
