// Measures how many hashed build files get a new name after a ONE-string change (every renamed file is a re-download for
// installed devices). Builds twice into a scratch outDir, restoring the edited file afterwards.
//   node scripts/chunk-stability.mjs [file] [search] [replace]
//   default: src/features/games/strings.ts  "find: 'Topchi!'"  "find: 'Topchi!!'"
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [file = 'src/features/games/strings.ts', search = "find: 'Topchi!'", replace = "find: 'Topchi!!'"] = process.argv.slice(2)
const out = 'dist-stability'
const build = () => {
  execSync(`npx vite build --outDir ${out} --emptyOutDir`, { stdio: 'ignore' })
  return readdirSync(join(out, 'assets')).sort()
}
const original = readFileSync(file, 'utf8')
if (!original.includes(search)) throw new Error(`"${search}" not found in ${file}`)
try {
  const before = build()
  writeFileSync(file, original.replace(search, replace))
  const after = build()
  const kept = after.filter((f) => before.includes(f))
  const renamed = after.filter((f) => !before.includes(f))
  console.log(`${file}: one-string change renamed ${renamed.length} of ${after.length} files (${kept.length} kept)`)
  console.log(renamed.join('\n'))
} finally {
  writeFileSync(file, original)
  rmSync(out, { recursive: true, force: true })
}
