import { encode } from 'uqr'

/*
 * QR encoding for the printed sheets. Everything runs on the device: the text goes in, a square of dark/light modules comes
 * out (uqr, a small MIT port of Project Nayuki's generator). Nothing is fetched and nothing is sent anywhere.
 *
 * Only this file and QrCode.tsx import the library, and QrCode is loaded with React.lazy from the print screens, so the
 * encoder lives in its own chunk that the rest of the app never downloads.
 */

export interface QrMatrix {
  /** Modules per side, without the quiet zone. */
  size: number
  version: number
  /** `modules[y][x]` is true for a dark module. */
  modules: boolean[][]
}

/** Error correction: M, raised as far as the chosen version allows (a bigger margin for creased or grey-printed paper at no extra size). */
export function qrMatrix(text: string): QrMatrix {
  const r = encode(text, { ecc: 'M', boostEcc: true, border: 0 })
  return { size: r.size, version: r.version, modules: r.data }
}

/** Quiet zone the QR specification asks for, in modules. */
export const QUIET_ZONE = 4

/**
 * SVG path data for the dark modules (one rectangle per horizontal run, offset by the quiet zone). One path, no
 * per-module elements: a 37 × 37 code is a few hundred bytes of markup.
 */
export function qrPath(m: QrMatrix, quiet = QUIET_ZONE): string {
  const parts: string[] = []
  for (let y = 0; y < m.size; y++) {
    const row = m.modules[y]
    let x = 0
    while (x < m.size) {
      if (!row[x]) {
        x++
        continue
      }
      const start = x
      while (x < m.size && row[x]) x++
      parts.push(`M${start + quiet} ${y + quiet}h${x - start}v1h-${x - start}z`)
    }
  }
  return parts.join('')
}

/** Side length of the whole drawing (code plus quiet zone) in modules. */
export function qrSide(m: QrMatrix, quiet = QUIET_ZONE): number {
  return m.size + quiet * 2
}
