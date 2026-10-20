import { Icon, f, shade } from '../svg-kit.mjs'

export { Icon, f, shade }
export const made = []

/** Draws one custom symbol: make('name', (ic) => { ... }) writes public/symbols/custom/name.svg. */
export function make(name, fn) {
  const ic = new Icon()
  fn(ic)
  ic.save(name)
  made.push(name)
}

/** Polygon with rounded corners (radius r) as an SVG path. */
export function roundPoly(pts, r) {
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]]
    const v2 = [p2[0] - p1[0], p2[1] - p1[1]]
    const l1 = Math.hypot(...v1)
    const l2 = Math.hypot(...v2)
    const k = Math.min(r, l1 / 2.2, l2 / 2.2)
    const a = [p1[0] + (v1[0] / l1) * k, p1[1] + (v1[1] / l1) * k]
    const b = [p1[0] + (v2[0] / l2) * k, p1[1] + (v2[1] / l2) * k]
    d += (i === 0 ? 'M' : 'L') + f(a[0]) + ' ' + f(a[1]) + ' Q' + f(p1[0]) + ' ' + f(p1[1]) + ' ' + f(b[0]) + ' ' + f(b[1]) + ' '
  }
  return d + 'Z'
}

export const regular = (n, cx, cy, R, rot = -90) =>
  Array.from({ length: n }, (_, i) => [cx + R * Math.cos(((rot + (360 / n) * i) * Math.PI) / 180), cy + R * Math.sin(((rot + (360 / n) * i) * Math.PI) / 180)])

export const leaf = (ic, x, y, rot = 0, s = 1) =>
  ic.path('M0 0 C20 -26 52 -26 70 -8 C52 14 20 18 0 0 Z', '#6fb35a', { tf: `translate(${x} ${y}) rotate(${rot}) scale(${s})`, sw: 2.5 })
