import type { CSSProperties, JSX } from 'react'

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface RishtanCornerProps {
  /** Width and height in CSS px (default 140). */
  size?: number
  /** Overall opacity (default 0.25). */
  opacity?: number
  /** Which corner the ornament hugs (default top-left). */
  corner?: Corner
  className?: string
  style?: CSSProperties
}

const FLIP: Record<Corner, string> = {
  'top-left': '',
  'top-right': 'translate(100 0) scale(-1 1)',
  'bottom-left': 'translate(0 100) scale(1 -1)',
  'bottom-right': 'translate(100 100) scale(-1 -1)',
}

/** Leaves along the arc, as on the rim of a Rishtan plate. */
const LEAVES = [14, 34, 56, 76].map((deg) => {
  const a = (deg * Math.PI) / 180
  return { x: Math.cos(a) * 62, y: Math.sin(a) * 62, rot: deg + 90 }
})

/** A quarter of a Rishtan plate rim: glazed arcs, almond leaves, a few dots. */
export function RishtanCorner({ size = 140, opacity = 0.25, corner = 'top-left', className, style }: RishtanCornerProps): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', opacity, ...style }}
    >
      <g transform={FLIP[corner]}>
        <path d="M0 0H48A48 48 0 0 1 0 48Z" fill="#8fd3d6" opacity="0.55" />
        <path d="M0 30A30 30 0 0 0 30 0" fill="none" stroke="#0a7584" strokeWidth="2.2" opacity="0.7" />
        <path d="M0 76A76 76 0 0 0 76 0" fill="none" stroke="#2b4fb5" strokeWidth="1.4" opacity="0.5" />
        <path d="M0 92A92 92 0 0 0 92 0" fill="none" stroke="#0a7584" strokeWidth="1" opacity="0.35" strokeDasharray="1 5" strokeLinecap="round" />
        {LEAVES.map((l) => (
          <path
            key={l.rot}
            d="M0-8C5-4 5 4 0 8-5 4-5-4 0-8Z"
            fill="#0a7584"
            opacity="0.55"
            transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot})`}
          />
        ))}
        <circle cx="16" cy="16" r="3" fill="#f4b740" opacity="0.8" />
      </g>
    </svg>
  )
}
