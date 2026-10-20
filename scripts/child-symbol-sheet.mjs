// Contact sheets for review: node scripts/child-symbol-sheet.mjs <outDir> [idsFile.json|id,id,...]
// Default ids = every entry of scripts/symbol-map.child.json. 40 symbols per sheet.
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
mkdirSync(out, { recursive: true })
const arg = process.argv[3]
const map = JSON.parse(readFileSync(join(root, 'scripts', 'symbol-map.child.json'), 'utf8'))
const ids = arg ? (arg.endsWith('.json') ? JSON.parse(readFileSync(arg, 'utf8')) : arg.split(',')) : Object.keys(map)
const all = {}
for (const f of ['symbol-map.json', 'symbol-map.child.json', 'symbol-map.games.json', 'symbol-map.adult.json']) {
  try { Object.assign(all, JSON.parse(readFileSync(join(root, 'scripts', f), 'utf8'))) } catch {}
}
const CELL = 150, COLS = 8, PER = 40
for (let s = 0; s * PER < ids.length; s++) {
  const chunk = ids.slice(s * PER, (s + 1) * PER)
  const rows = Math.ceil(chunk.length / COLS)
  const comps = []
  for (let i = 0; i < chunk.length; i++) {
    const id = chunk[i]
    const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * (CELL + 22)
    const src = all[id]
    try {
      const file = src?.startsWith('custom:') ? join(root, 'public/symbols/custom', src.slice(7)) : join(root, 'public/symbols', id + '.webp')
      const img = await sharp(file, { density: 144 }).resize(CELL - 16, CELL - 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
      comps.push({ input: img, left: x + 8, top: y + 4 })
    } catch (e) {
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="40"><text x="4" y="24" font-size="14" fill="red">MISSING</text></svg>`), left: x, top: y + 40 })
    }
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="20"><text x="${CELL / 2}" y="14" font-size="11" text-anchor="middle" font-family="Arial" fill="#222">${id}</text></svg>`), left: x, top: y + CELL - 8 })
  }
  await sharp({ create: { width: CELL * COLS, height: rows * (CELL + 22), channels: 4, background: '#f3efe6' } }).composite(comps).png().toFile(join(out, `sheet-${String(s + 1).padStart(2, '0')}.png`))
}
console.log(`sheets: ${Math.ceil(ids.length / PER)} in ${out}`)
