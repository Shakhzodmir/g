// Guards the old-engine rules (classroom boards / panels run Android WebView and Chrome 90-110, iOS 15-16).
// See e2e/compat-strip.mjs for the visual proof and vite.config.ts for what lightningcss does and does not down-level.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : []))
const FILES = walk(SRC)
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, '/')

interface Decl {
  file: string
  prop: string
  value: string
  /** at-rule preludes around the declaration, outermost first */
  ctx: string[]
  /** id of the style rule block, to find earlier declarations of the same rule */
  block: number
  index: number
}

function parseDecls(file: string): Decl[] {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Decl[] = []
  const stack: Array<{ prelude: string; id: number }> = []
  let nextId = 0
  let buf = ''
  let idx = 0
  for (const ch of css) {
    if (ch === '{') {
      stack.push({ prelude: buf.trim(), id: nextId++ })
      buf = ''
    } else if (ch === '}') {
      flush()
      stack.pop()
      buf = ''
    } else if (ch === ';') {
      flush()
      buf = ''
    } else buf += ch
  }
  function flush() {
    const t = buf.trim()
    const c = t.indexOf(':')
    if (!t || c < 0 || stack.length === 0 || t.startsWith('@')) return
    out.push({
      file,
      prop: t.slice(0, c).trim(),
      value: t.slice(c + 1).trim(),
      ctx: stack.map((s) => s.prelude).filter((p) => p.startsWith('@')),
      block: stack[stack.length - 1].id,
      index: idx++,
    })
  }
  return out
}
const DECLS = FILES.flatMap(parseDecls)

describe('old-engine CSS', () => {
  it('uses no raw dvh/svh/lvh units (use var(--dvh100) / calc(N * var(--dvh)), see design/tokens.css)', () => {
    const bad = DECLS.filter((d) => /\d(dvh|svh|lvh)\b/.test(d.value) && !(rel(d.file) === 'design/tokens.css' && d.prop.startsWith('--dvh')))
    expect(bad.map((d) => `${rel(d.file)}: ${d.prop}: ${d.value}`)).toEqual([])
  })

  it('has the vh fallbacks for --dvh and --dvh100', () => {
    const tokens = DECLS.filter((d) => rel(d.file) === 'design/tokens.css' && d.prop.startsWith('--dvh'))
    expect(tokens.find((d) => d.prop === '--dvh' && d.value === '1vh' && d.ctx.length === 0)).toBeTruthy()
    expect(tokens.find((d) => d.prop === '--dvh100' && d.value === '100vh' && d.ctx.length === 0)).toBeTruthy()
    expect(tokens.find((d) => d.prop === '--dvh' && d.value === '1dvh' && d.ctx.some((c) => /height:\s*1dvh/.test(c)))).toBeTruthy()
  })

  it('uses no individual translate / scale / rotate properties (Chrome < 104)', () => {
    const bad = DECLS.filter((d) => /^(translate|scale|rotate)$/.test(d.prop) || /transition(-property)?$/.test(d.prop) && /(^|[\s,])(translate|scale|rotate)\b/.test(d.value))
    expect(bad.map((d) => `${rel(d.file)}: ${d.prop}: ${d.value}`)).toEqual([])
  })

  it('uses no :has() (Chrome < 105, Safari < 15.4): set an attribute from JS instead', () => {
    const raw = FILES.filter((f) => /:has\(/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')))
    expect(raw.map(rel)).toEqual([])
  })

  it('gives every color-mix() a solid fallback (an earlier declaration of the same property, or an @supports guard)', () => {
    const problems: string[] = []
    for (const d of DECLS.filter((x) => x.value.includes('color-mix('))) {
      if (d.ctx.some((c) => /^@supports\s+\(?\s*color:\s*color-mix/.test(c))) continue
      const earlier = DECLS.some((e) => e.file === d.file && e.block === d.block && e.prop === d.prop && e.index < d.index && !e.value.includes('color-mix('))
      if (!earlier) problems.push(`${rel(d.file)}: ${d.prop}: ${d.value.slice(0, 60)}`)
    }
    expect(problems).toEqual([])
  })

  it('never feeds color-mix() into a custom property outside an @supports guard (it would paint black, not fall back)', () => {
    const bad = DECLS.filter((d) => d.prop.startsWith('--') && d.value.includes('color-mix(') && !d.ctx.some((c) => /^@supports\s+\(?\s*color:\s*color-mix/.test(c)))
    expect(bad.map((d) => `${rel(d.file)}: ${d.prop}`)).toEqual([])
  })

  it('has a non-container fallback next to every @container block and cq unit', () => {
    const problems: string[] = []
    for (const f of FILES) {
      const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const containers = (css.match(/@container\b/g) ?? []).length
      const fallbacks = (css.match(/@supports not \(container-type: inline-size\)/g) ?? []).length
      if (containers > fallbacks) problems.push(`${rel(f)}: ${containers} @container blocks, ${fallbacks} @supports-not fallbacks`)
    }
    for (const d of DECLS.filter((x) => /\d(cqi|cqb|cqw|cqh|cqmin|cqmax)\b/.test(x.value))) {
      const guarded = d.ctx.some((c) => /^@supports\s+\(container-type/.test(c))
      const earlier = DECLS.some((e) => e.file === d.file && e.block === d.block && e.prop === d.prop && e.index < d.index && !/\d(cqi|cqb|cqw|cqh|cqmin|cqmax)\b/.test(e.value))
      // a custom property carrying cq units is only acceptable inside an @supports guard
      if (!guarded && !(earlier && !d.prop.startsWith('--'))) problems.push(`${rel(d.file)}: ${d.prop}: ${d.value.slice(0, 60)}`)
    }
    expect(problems).toEqual([])
  })
})
