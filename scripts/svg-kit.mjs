// Tiny helper kit for the app's custom "soft 3D" symbols (256×256, gradient fills, thin darker outline, ground shadow).
// Used by scripts/gen-number-symbols.mjs and scripts/gen-child-symbols.mjs.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'symbols', 'custom')
mkdirSync(OUT, { recursive: true })

export const f = (n) => Math.round(n * 10) / 10

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** Mix `h` toward white (amt > 0) or black (amt < 0). */
export function shade(h, amt) {
  const t = amt >= 0 ? 255 : 0
  const k = Math.abs(amt)
  return toHex(hex(h).map((v) => v + (t - v) * k))
}

/** One icon under construction. fill(color) -> url(#gradient) memoised; shadow() draws the ground shadow. */
export class Icon {
  constructor() {
    this.defs = []
    this.body = []
    this.n = 0
    this.cache = new Map()
  }
  id() {
    return 'g' + this.n++
  }
  /** vertical-ish gradient from a lighter to a darker tone of `c` (angle: 'v' | 'd' diagonal | 'h') */
  fill(c, dir = 'd') {
    const key = c + dir
    if (this.cache.has(key)) return this.cache.get(key)
    const id = this.id()
    const [x1, y1, x2, y2] = dir === 'v' ? [0, 0, 0, 1] : dir === 'h' ? [0, 0, 1, 0] : [0.15, 0, 0.85, 1]
    this.defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${shade(c, 0.38)}"/><stop offset="0.5" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.22)}"/></linearGradient>`,
    )
    const u = `url(#${id})`
    this.cache.set(key, u)
    return u
  }
  sphere(c) {
    const key = 's' + c
    if (this.cache.has(key)) return this.cache.get(key)
    const id = this.id()
    this.defs.push(
      `<radialGradient id="${id}" cx="0.36" cy="0.3" r="0.85"><stop offset="0" stop-color="${shade(c, 0.55)}"/><stop offset="0.5" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.28)}"/></radialGradient>`,
    )
    const u = `url(#${id})`
    this.cache.set(key, u)
    return u
  }
  add(s) {
    this.body.push(s)
    return this
  }
  shadow(cx = 128, cy = 228, rx = 78, ry = 11, op = 0.22) {
    const id = this.id()
    this.defs.push(
      `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3b2f2c" stop-opacity="${op}"/><stop offset="0.65" stop-color="#3b2f2c" stop-opacity="${f(op * 0.45)}"/><stop offset="1" stop-color="#3b2f2c" stop-opacity="0"/></radialGradient>`,
    )
    this.body.unshift(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`)
    return this
  }
  /** rounded rect with gradient + outline */
  rect(x, y, w, h, r, c, o = {}) {
    const stroke = o.stroke === false ? '' : ` stroke="${o.strokeColor ?? shade(c, -0.35)}" stroke-width="${o.sw ?? 3}"`
    return this.add(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${o.flat ? c : this.fill(c, o.dir)}"${stroke}${o.op ? ` opacity="${o.op}"` : ''}${o.tf ? ` transform="${o.tf}"` : ''}/>`)
  }
  circle(cx, cy, r, c, o = {}) {
    const stroke = o.stroke === false ? '' : ` stroke="${o.strokeColor ?? shade(c, -0.35)}" stroke-width="${o.sw ?? 3}"`
    return this.add(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${o.flat ? c : o.sphere ? this.sphere(c) : this.fill(c, o.dir)}"${stroke}/>`)
  }
  ellipse(cx, cy, rx, ry, c, o = {}) {
    const stroke = o.stroke === false ? '' : ` stroke="${o.strokeColor ?? shade(c, -0.35)}" stroke-width="${o.sw ?? 3}"`
    return this.add(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${o.flat ? c : o.sphere ? this.sphere(c) : this.fill(c, o.dir)}"${stroke}${o.tf ? ` transform="${o.tf}"` : ''}/>`)
  }
  path(d, c, o = {}) {
    const stroke = o.stroke === false ? '' : ` stroke="${o.strokeColor ?? shade(c, -0.35)}" stroke-width="${o.sw ?? 3}" stroke-linejoin="round" stroke-linecap="round"`
    return this.add(`<path d="${d}" fill="${o.flat ? c : this.fill(c, o.dir)}"${stroke}${o.tf ? ` transform="${o.tf}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`)
  }
  line(d, c, w = 6, o = {}) {
    return this.add(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}${o.tf ? ` transform="${o.tf}"` : ''}/>`)
  }
  /** soft white highlight */
  shine(cx, cy, rx, ry, rot = -30, op = 0.7) {
    const id = this.id()
    this.defs.push(`<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="${op}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`)
    return this.add(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="url(#${id})"/>`)
  }
  svg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<defs>\n${this.defs.join('\n')}\n</defs>\n${this.body.join('\n')}\n</svg>\n`
  }
  save(name) {
    writeFileSync(join(OUT, `${name}.svg`), this.svg())
  }
}
