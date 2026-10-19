import { useId, type CSSProperties, type JSX } from 'react'

export interface IkatBandProps {
  /** Band height in CSS px; the pattern scales with it (default 20). */
  height?: number
  /** Overall opacity (default 0.3). Keep it low: ornament lives only in quiet zones. */
  opacity?: number
  className?: string
  style?: CSSProperties
}

/**
 * A quiet horizontal band of abr (ikat) diamonds with the soft "bleeding"
 * stepped edges of resist-dyed silk. Fills its container's width.
 */
export function IkatBand({ height = 20, opacity = 0.3, className, style }: IkatBandProps): JSX.Element {
  const pid = `ikat-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const k = height / 20
  return (
    <svg
      className={className}
      width="100%"
      height={height}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', opacity, ...style }}
    >
      <defs>
        <pattern id={pid} width="44" height="20" patternUnits="userSpaceOnUse" patternTransform={`scale(${k})`}>
          {/* thread line */}
          <rect x="0" y="9.3" width="44" height="1.4" rx="0.7" fill="#0a7584" opacity="0.45" />
          {/* outer diamond with stepped, blurred edges */}
          <path
            d="M22 1.5 25 4.5H24.2L28 8H27.3L30.5 10 27.3 12H28L24.2 15.5H25L22 18.5 19 15.5H19.8L16 12H16.7L13.5 10 16.7 8H16L19.8 4.5H19Z"
            fill="#8fd3d6"
          />
          <path d="M22 5.5 26 10 22 14.5 18 10Z" fill="#2b4fb5" opacity="0.55" />
          <circle cx="22" cy="10" r="1.3" fill="#fbf7f0" />
          {/* small saffron knots between motifs */}
          <circle cx="0" cy="10" r="1.7" fill="#f4b740" opacity="0.8" />
          <circle cx="44" cy="10" r="1.7" fill="#f4b740" opacity="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  )
}
