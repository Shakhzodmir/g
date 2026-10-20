// Builds scripts/symbol-map.child.json: resolves every symbol id used in src/content/more.ts that no other symbol map defines.
//  - a file public/symbols/custom/<id>.svg  -> "custom:<id>.svg"
//  - otherwise the id is the lowercase_underscore form of a Fluent Emoji folder name (Medium skin tone preferred for people)
// Usage: node scripts/build-child-symbol-map.mjs      (then: node scripts/fetch-symbols.mjs)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scripts = join(root, 'scripts')
const OWN = 'symbol-map.child.json'
const other = {}
for (const f of readdirSync(scripts).filter((n) => /^symbol-map(\..+)?\.json$/.test(n) && n !== OWN)) Object.assign(other, JSON.parse(readFileSync(join(scripts, f), 'utf8')))

const files = readFileSync(join(scripts, '.cache', 'fluent-3d-files.txt'), 'utf8').split(/\r?\n/).filter(Boolean)
const byId = new Map() // id -> candidate paths
for (const p of files) {
  const folder = p.split('/')[1]
  const id = folder.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (!byId.has(id)) byId.set(id, [])
  byId.get(id).push(p)
}
function resolve(id) {
  const c = byId.get(id)
  if (!c) return null
  return c.find((p) => /\/Medium\/3D\//.test(p)) ?? c.find((p) => /\/Default\/3D\//.test(p)) ?? c.find((p) => /^assets\/[^/]+\/3D\//.test(p)) ?? null
}

// symbol ids referenced by the children's additions (src/content/more.ts + more/*.ts), evaluated with tsx
import { execFileSync } from 'node:child_process'
const used = new Set(JSON.parse(execFileSync('npx', ['tsx', 'scripts/list-child-symbols.ts'], { cwd: root, shell: true, encoding: 'utf8' }).trim().split(String.fromCharCode(10)).pop()))
const extra = existsSync(join(scripts, 'child-symbol-ids.json')) ? JSON.parse(readFileSync(join(scripts, 'child-symbol-ids.json'), 'utf8')) : []
// generated custom symbols are always mapped (number tiles are listed explicitly)
for (const id of extra) used.add(id)
for (let n = 11; n <= 20; n++) used.add(`number_${n}`)

const out = {}
const unresolved = []
for (const id of [...used].sort()) {
  if (id in other) continue
  if (existsSync(join(root, 'public', 'symbols', 'custom', `${id}.svg`))) out[id] = `custom:${id}.svg`
  else if (resolve(id)) out[id] = resolve(id)
}
// ids that look like symbols (appear as the symbol argument) but did not resolve are reported by the content test, not here
writeFileSync(join(scripts, OWN), JSON.stringify(out, null, 1) + '\n')
console.log(`symbol-map.child.json: ${Object.keys(out).length} entries (${Object.values(out).filter((v) => v.startsWith('custom:')).length} custom)`)
