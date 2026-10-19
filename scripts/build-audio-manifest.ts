// Collects every text the app speaks into scripts/.cache/audio-manifest.json for scripts/gen_audio.py.
// The manifest itself is built by scripts/audio-manifest.ts (shared with the key-coverage test).
// Run: npx tsx scripts/build-audio-manifest.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildManifest } from './audio-manifest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const entries = buildManifest()

mkdirSync(join(root, 'scripts', '.cache'), { recursive: true })
writeFileSync(join(root, 'scripts', '.cache', 'audio-manifest.json'), JSON.stringify(entries, null, 1))
const chars = entries.reduce((n, e) => n + e.text.length, 0)
console.log(`audio manifest: ${entries.length} clips (${entries.filter((e) => e.lang === 'uz').length} uz, ${entries.filter((e) => e.lang === 'ru').length} ru), ${chars} characters`)
