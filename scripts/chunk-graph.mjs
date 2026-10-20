// Prints static-import cycles between built JS chunks (cycles make every chunk's hash depend on all the others).
//   node scripts/chunk-graph.mjs [dist/assets]
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const dir = process.argv[2] ?? 'dist/assets'
const files = readdirSync(dir).filter((f) => f.endsWith('.js'))
const graph = new Map(files.map((f) => [f, [...readFileSync(join(dir, f), 'utf8').matchAll(/(?:^|[;}])\s*import[^'"`;]*?from\s*"\.\/([^"]+\.js)"/g)].map((m) => m[1]).filter((x) => files.includes(x))]))
const name = (f) => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')
const stack = []
const state = new Map()
const cycles = new Set()
function visit(f) {
  state.set(f, 1)
  stack.push(f)
  for (const t of graph.get(f) ?? []) {
    if (state.get(t) === 1) cycles.add(stack.slice(stack.indexOf(t)).map(name).join(' -> ') + ' -> ' + name(t))
    else if (!state.has(t)) visit(t)
  }
  stack.pop()
  state.set(f, 2)
}
for (const f of files) if (!state.has(f)) visit(f)
console.log(cycles.size ? [...cycles].join('\n') : 'no static import cycles')
