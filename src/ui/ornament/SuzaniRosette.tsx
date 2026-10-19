import type { CSSProperties, JSX } from 'react'

export interface SuzaniRosetteProps {
  /** Width and height in CSS px (default 120). */
  size?: number
  /** Overall opacity (default 0.25). */
  opacity?: number
  className?: string
  style?: CSSProperties
}

const PETALS = Array.from({ length: 8 }, (_, i) => i * 45)

/** A soft suzani medallion (oy, the "moon" rosette): petals, a thin ring, a calm centre. */
export function SuzaniRosette({ size = 120, opacity = 0.25, className, style }: SuzaniRosetteProps): JSX.Element {
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
      <g transform="translate(50 50)">
        {/* outer petals */}
        {PETALS.map((a) => (
          <path key={a} d="M0-47C7-41 8-31 0-24-8-31-7-41 0-47Z" fill="#8fd3d6" transform={`rotate(${a})`} />
        ))}
        {/* leaves between petals */}
        {PETALS.map((a) => (
          <path key={`l${a}`} d="M0-38C4-34 4-29 0-26-4-29-4-34 0-38Z" fill="#0a7584" opacity="0.55" transform={`rotate(${a + 22.5})`} />
        ))}
        <circle r="22" fill="#fbf7f0" />
        <circle r="22" fill="none" stroke="#2b4fb5" strokeWidth="1.6" opacity="0.6" />
        {/* inner petals */}
        {PETALS.map((a) => (
          <ellipse key={`i${a}`} cx="0" cy="-13" rx="4.2" ry="6.5" fill="#f4b740" opacity="0.7" transform={`rotate(${a})`} />
        ))}
        <circle r="6.5" fill="#2b4fb5" opacity="0.75" />
        <circle r="2.4" fill="#fbf7f0" />
      </g>
    </svg>
  )
}
