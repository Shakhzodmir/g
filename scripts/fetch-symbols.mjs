// Downloads the Fluent Emoji 3D PNGs listed in scripts/symbol-map*.json and converts them to 192 px WebP.
// Usage: node scripts/fetch-symbols.mjs [--force]
// Fluent Emoji © Microsoft, MIT License — https://github.com/microsoft/fluentui-emoji
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// scripts/symbol-map.json plus any scripts/symbol-map.<name>.json (each author keeps their own file so parallel edits never clash)
const map = {}
for (const f of readdirSync(join(root, 'scripts')).filter((n) => /^symbol-map(\..+)?\.json$/.test(n)).sort()) {
  Object.assign(map, JSON.parse(readFileSync(join(root, 'scripts', f), 'utf8')))
}
const out = join(root, 'public', 'symbols')
const force = process.argv.includes('--force')
mkdirSync(out, { recursive: true })

const RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/'
const jobs = Object.entries(map).filter(([, src]) => typeof src === 'string' && !src.startsWith('custom:'))
let done = 0
let failed = []

async function one([id, path]) {
  const file = join(out, `${id}.webp`)
  if (!force && existsSync(file)) return
  const url = RAW + path.split('/').map(encodeURIComponent).join('/')
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await sharp(buf).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(file)
      done++
      return
    } catch (e) {
      if (attempt === 3) failed.push(`${id}: ${e.message} (${path})`)
      else await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  }
}

const queue = jobs.slice()
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) await one(queue.shift())
  }),
)
writeFileSync(
  join(out, 'LICENSE-fluent-emoji.txt'),
  'Symbols in this folder (except custom/) are Microsoft Fluent Emoji 3D, converted to WebP.\nCopyright (c) Microsoft Corporation. MIT License. https://github.com/microsoft/fluentui-emoji\n',
)
console.log(`symbols: ${done} downloaded, ${jobs.length - done - failed.length} cached, ${failed.length} failed`)
if (failed.length) {
  console.error(failed.join('\n'))
  process.exitCode = 1
}
