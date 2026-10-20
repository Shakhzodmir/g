// Generates the custom soft-3D symbols used by src/content/more.ts that have no Fluent Emoji equivalent
// (colour discs, geometric shapes, opposites, Uzbek realia, kitchen / house / clothes / stationery items, position diagrams, body parts).
// Usage: node scripts/gen-child-symbols.mjs   (then: node scripts/build-child-symbol-map.mjs && node scripts/fetch-symbols.mjs)
import { made } from './child-symbols/lib.mjs'
import './child-symbols/part1.mjs'
import './child-symbols/part2.mjs'
import './child-symbols/part3.mjs'
import './child-symbols/part4.mjs'

console.log(`${made.length} custom symbols written: ${made.join(' ')}`)

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// the symbol-map builder reads this list so every generated symbol is mapped even before a word uses it
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'child-symbol-ids.json'), JSON.stringify(made, null, 1) + '\n')
