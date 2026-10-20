import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Best-effort guard against hard-coded user-facing text in JSX: every visible string must come from a strings.ts
 * dictionary (so it exists in Uzbek Latin, Cyrillic and Russian). Flags literal words between tags and in
 * aria-label / title / placeholder / alt attributes. Brand names, keyboard keys and symbols are allowed.
 */
const ALLOWED = new Set(['Tilni tanlang', 'Выберите язык', 'Gapimiz', 'Musicha', 'PIN', 'AAC', 'PDF', 'Alt+B', 'MIT', 'Enter', 'A4', 'OK'])
const SKIP_FILES = /(\.test\.|ArtPreview|[\\/]lib[\\/]Lang\.tsx)/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') && !SKIP_FILES.test(p)) out.push(p)
  }
  return out
}

const TEXT = />\s*([^<>{}\n]*[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]{2,}[^<>{}\n]*)\s*</g
const ATTR = /\b(aria-label|title|placeholder|alt|label)=("([^"{}]*[A-Za-zА-Яа-яЁё]{2,}[^"{}]*)")/g

describe('no hard-coded user-facing text in JSX', () => {
  it('every visible string comes from a dictionary', () => {
    const bad: string[] = []
    for (const file of walk('src')) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(TEXT)) {
        const text = m[1].trim()
        if (!text || ALLOWED.has(text)) continue
        // generics / arrow function remnants such as `Array<string>(` or `=> a > b` are not JSX text
        if (/[=;()&|[\]]|=>|\bextends\b|^(return|new|const|await|typeof)\b|^Promise\b/.test(text)) continue
        bad.push(`${file}: «${text}»`)
      }
      for (const m of src.matchAll(ATTR)) {
        const text = m[3].trim()
        if (ALLOWED.has(text) || /^[a-z][\w-]*$/.test(text) && !/\s/.test(text) && m[1] === 'label' ) continue
        bad.push(`${file}: ${m[1]}="${text}"`)
      }
    }
    expect(bad, bad.join('\n')).toEqual([])
  })
})
