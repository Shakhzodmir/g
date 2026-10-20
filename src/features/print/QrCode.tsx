import { useMemo } from 'react'
import { qrMatrix, qrPath, qrSide } from './qr'

/**
 * A QR code as one inline SVG: pure black on white with the full quiet zone built in, so it scans from a printout, from
 * a black-and-white copy and from a phone screen. The size comes from the parent (the svg fills its box).
 * Loaded lazily (see QrLink): this module is the only one that pulls in the encoder.
 */
export default function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  const code = useMemo(() => {
    const m = qrMatrix(text)
    return { side: qrSide(m), d: qrPath(m) }
  }, [text])
  return (
    <svg className={className} viewBox={`0 0 ${code.side} ${code.side}`} role="img" aria-label={label} shapeRendering="crispEdges" preserveAspectRatio="xMidYMid meet">
      <rect width={code.side} height={code.side} fill="#fff" />
      <path d={code.d} fill="#000" />
    </svg>
  )
}
