// Generates public/symbols/custom/number_11.svg … number_20.svg in the style of the Fluent "keycap" digits
// (blue soft-3D tile, white rounded numerals). 1–10 use the Fluent keycaps themselves.
// Usage: node scripts/gen-number-symbols.mjs
import { Icon } from './svg-kit.mjs'

/** Stroke glyphs in a 60 × 100 box (origin top-left), drawn with round caps. */
const GLYPH = {
  0: 'M30 4 C10 4 6 26 6 50 C6 74 10 96 30 96 C50 96 54 74 54 50 C54 26 50 4 30 4 Z',
  1: 'M10 26 L34 4 L34 96',
  2: 'M8 28 C8 2 54 0 54 28 C54 52 10 72 6 96 L56 96',
  3: 'M8 12 C30 -2 56 14 46 38 C42 46 32 48 26 48 C54 50 58 80 42 92 C26 104 8 96 4 84',
  4: 'M44 96 L44 4 L4 66 L58 66',
  5: 'M52 6 L16 6 L10 48 C34 36 58 52 54 74 C50 100 20 102 4 88',
  6: 'M50 10 C30 -2 6 14 6 56 C6 100 56 98 54 70 C52 46 20 42 6 64',
  7: 'M6 6 L56 6 L22 96',
  8: 'M30 48 C6 44 8 4 30 4 C52 4 54 44 30 48 C4 52 4 96 30 96 C56 96 56 52 30 48 Z',
  9: 'M10 90 C30 102 54 86 54 44 C54 0 4 2 6 30 C8 54 40 58 54 36',
}

function digit(d, x, y, s, color, w) {
  return `<path d="${GLYPH[d]}" transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
}

for (let n = 11; n <= 20; n++) {
  const s = String(n)
  const ic = new Icon()
  ic.shadow(128, 232, 84, 11, 0.24)
  ic.rect(28, 28, 200, 200, 52, '#4a93f2', { sw: 3, strokeColor: '#2a64c4', dir: 'v' })
  ic.shine(86, 66, 56, 26, -20, 0.55)
  // two numerals side by side; digit box is 60 × 100 at scale 1.05
  const sc = 1.05
  const gw = 60 * sc
  const gap = 20
  const total = gw * 2 + gap
  const x0 = 128 - total / 2
  const y0 = 128 - 52 + 6
  for (let i = 0; i < 2; i++) {
    const x = x0 + i * (gw + gap)
    ic.add(digit(s[i], x + 3, y0 + 5, sc, '#1b4fa8', 15).replace('stroke="#1b4fa8"', 'stroke="#1b4fa8" opacity="0.35"'))
    ic.add(digit(s[i], x, y0, sc, '#ffffff', 15))
  }
  ic.save(`number_${n}`)
}
console.log('number_11 … number_20 written')
