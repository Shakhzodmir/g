import type { ColorId, OppVisual, ShapeId } from '../../content/gamedata'
import { COLORS } from '../../content/gamedata'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Kid.module.css'

/** Drawn pictures for the children's games: crisp at any size, themed, never the only carrier of meaning. */

/** A round colour swatch with a soft highlight (white and light colours get an outline). */
export function Swatch({ color }: { color: ColorId }) {
  const hex = COLORS.find((c) => c.id === color)?.hex ?? '#999'
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="43" fill={hex} stroke="rgba(0,0,0,.28)" strokeWidth="3" />
      <ellipse cx="38" cy="33" rx="15" ry="9" fill="#fff" opacity=".28" transform="rotate(-30 38 33)" />
    </svg>
  )
}

function starPoints(): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 45 : 19
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(53 + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
const STAR = starPoints()

/** The eight shapes, all drawn in the same calm colour so only the form differs. */
export function ShapeSvg({ shape }: { shape: ShapeId }) {
  const common = { fill: 'var(--primary)', stroke: 'var(--primary)', strokeWidth: 8, strokeLinejoin: 'round' as const }
  let el
  switch (shape) {
    case 'circle':
      el = <circle cx="50" cy="50" r="40" {...common} />
      break
    case 'square':
      el = <rect x="16" y="16" width="68" height="68" rx="4" {...common} />
      break
    case 'triangle':
      el = <polygon points="50,14 88,82 12,82" {...common} />
      break
    case 'rectangle':
      el = <rect x="8" y="27" width="84" height="46" rx="4" {...common} />
      break
    case 'star':
      el = <polygon points={STAR} {...common} strokeWidth={5} />
      break
    case 'heart':
      el = <path d="M50 84 C16 58 10 32 28 22 C40 16 50 24 50 31 C50 24 60 16 72 22 C90 32 84 58 50 84Z" {...common} strokeWidth={5} />
      break
    case 'oval':
      el = <ellipse cx="50" cy="50" rx="43" ry="28" {...common} />
      break
    case 'diamond':
      el = <polygon points="50,9 90,50 50,91 10,50" {...common} />
      break
  }
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
      {el}
    </svg>
  )
}

/** A big numeral for counting cards. */
export function Numeral({ n }: { n: number }) {
  return (
    <span className={styles.numeral} aria-hidden="true">
      {n}
    </span>
  )
}

function Glass({ full }: { full: boolean }) {
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id={full ? 'gl-full' : 'gl-empty'}>
          <path d="M26 14 H74 L68 86 Q67.500 90 63 90 H37 Q32.500 90 32 86 Z" />
        </clipPath>
      </defs>
      {full && <rect x="20" y="30" width="60" height="62" fill="#5AB8F0" clipPath="url(#gl-full)" />}
      <path d="M26 14 H74 L68 86 Q67.500 90 63 90 H37 Q32.500 90 32 86 Z" fill="rgba(255,255,255,.35)" stroke="var(--text-muted, #5b6470)" strokeWidth="4" strokeLinejoin="round" />
      {full && <path d="M30 36 H70" stroke="#fff" strokeWidth="3" opacity=".6" strokeLinecap="round" />}
    </svg>
  )
}

function Shirt({ dirty }: { dirty: boolean }) {
  return (
    <span className={styles.comp}>
      <SymbolImg id="t_shirt" />
      {dirty ? (
        <svg className={styles.overlay} viewBox="0 0 100 100" aria-hidden="true">
          <path d="M36 52 q-8 4 -3 12 q6 6 12 0 q4 -8 -9 -12Z" fill="#6b4a2f" opacity=".85" />
          <path d="M60 62 q-6 2 -4 9 q5 5 10 0 q3 -7 -6 -9Z" fill="#7a5636" opacity=".85" />
          <circle cx="52" cy="44" r="4" fill="#6b4a2f" opacity=".8" />
          <circle cx="68" cy="50" r="3" fill="#7a5636" opacity=".8" />
        </svg>
      ) : (
        <span className={styles.sparkle}>
          <SymbolImg id="sparkles" />
        </span>
      )}
    </span>
  )
}

/** One side of an opposite pair: a symbol or a small drawn composition. */
export function OppPicture({ visual }: { visual: OppVisual }) {
  if ('symbol' in visual) return <SymbolImg id={visual.symbol} />
  switch (visual.comp) {
    case 'glass_full':
      return <Glass full />
    case 'glass_empty':
      return <Glass full={false} />
    case 'shirt_clean':
      return <Shirt dirty={false} />
    case 'shirt_dirty':
      return <Shirt dirty />
  }
}
