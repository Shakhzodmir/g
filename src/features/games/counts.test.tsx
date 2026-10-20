import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithVars } from '../../i18n'
import { pluralizeForms } from '../../i18n/plural'
import type { SpeechLang, UiLang } from '../../i18n/types'
import { defaultProfile, useProfileStore } from '../../store/profile'
import { COUNTERS, gameCount } from './counts'
import { Hub } from './Hub'
import { gameChips } from './meta'
import { GAMES, gamesFor } from './registry'
import { S } from './strings'

const KINDS = ['child', 'adult'] as const
const LANGS: SpeechLang[] = ['uz', 'ru']
const UI: Array<[UiLang, 'latn' | 'cyrl']> = [
  ['uz', 'latn'],
  ['uzc', 'cyrl'],
  ['ru', 'latn'],
]

/** The translator of the games dictionary for a UI language, exactly as `useStrings(S)` renders it. */
const translator = (ui: UiLang, script: 'latn' | 'cyrl') => (key: keyof typeof S.uz, vars?: Record<string, string | number>) =>
  renderWithVars({ uz: S.uz[key], ru: S.ru[key] }, ui, script, vars)

const serving = (kind: 'child' | 'adult') => GAMES.filter((g) => g.audience === 'both' || g.audience === kind)

describe('game ages', () => {
  it.each(GAMES.map((g) => [g.id, g] as const))('%s has a valid [from, to] age range in whole years', (_id, g) => {
    const [from, to] = g.ages
    expect(Number.isInteger(from) && Number.isInteger(to)).toBe(true)
    expect(from).toBeGreaterThanOrEqual(1)
    expect(to).toBeGreaterThanOrEqual(from)
    expect(to).toBeLessThanOrEqual(99)
    if (g.audience !== 'adult') {
      // a children's game: the range sits inside the child profile ages (2..12)
      expect(from).toBeGreaterThanOrEqual(2)
      expect(to).toBeLessThanOrEqual(12)
    } else {
      expect(from).toBeGreaterThanOrEqual(16)
    }
  })

  it('every game id is unique', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length)
  })
})

describe('game counts come from the real pools', () => {
  it('has a counter for every registered game and no counter for a game that is gone', () => {
    expect(Object.keys(COUNTERS).sort()).toEqual(GAMES.map((g) => g.id).sort())
  })

  for (const kind of KINDS) {
    for (const lang of LANGS) {
      it(`${kind}/${lang}: every game of the audience has a count above zero`, () => {
        for (const g of serving(kind)) {
          const c = gameCount(g.id, kind, lang)
          expect(Number.isInteger(c.n), `${g.id} count is a whole number`).toBe(true)
          expect(c.n, `${g.id} has something to play for ${kind}/${lang}`).toBeGreaterThan(0)
        }
      })
    }
  }

  it('the counts are real numbers, not placeholders: the large pools are large, the small ones small', () => {
    expect(gameCount('colors', 'child', 'uz').n).toBe(12)
    expect(gameCount('shapes', 'child', 'uz').n).toBe(8)
    expect(gameCount('count', 'child', 'uz')).toEqual({ n: 10, unit: 'number' })
    expect(gameCount('find', 'child', 'uz').n).toBeGreaterThan(50)
    expect(gameCount('syllables', 'child', 'uz').n).toBeGreaterThan(50)
    expect(gameCount('opposite', 'child', 'uz').unit).toBe('pair')
  })

  it('the language matters where the game works on spelling (syllables, first sounds, building words)', () => {
    // not necessarily different numbers, but both languages must be computed (not copied)
    for (const id of ['syllables', 'sound', 'build'] as const) {
      expect(gameCount(id, 'child', 'uz').n).toBeGreaterThan(0)
      expect(gameCount(id, 'child', 'ru').n).toBeGreaterThan(0)
    }
  })

  it('a child profile and an adult profile do not share a pool in the games that serve both', () => {
    for (const id of ['find', 'memory', 'syllables']) {
      expect(gameCount(id, 'child', 'uz').n).not.toBe(gameCount(id, 'adult', 'uz').n)
    }
  })

  it('an unknown game counts as zero (and the test above would fail for a registered one)', () => {
    expect(gameCount('nonexistent', 'child', 'uz').n).toBe(0)
  })
})

describe('hub labels match the computed numbers', () => {
  for (const [ui, script] of UI) {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        it(`${ui} / ${kind} / ${lang}: age and count text are built from the data`, () => {
          const t = translator(ui, script)
          for (const g of serving(kind)) {
            const c = gameCount(g.id, kind, lang)
            const chips = gameChips(g, c, kind, t)
            // the exact number is in the text, once, and no placeholder or plural-form separator is left behind
            expect(chips.count, g.id).toContain(String(c.n))
            expect(chips.text, g.id).not.toMatch(/[{}|]/)
            if (kind === 'child' && g.audience !== 'adult') {
              const [from, to] = g.ages
              expect(chips.age, g.id).toContain(`${from}–${to}`)
              expect(chips.text).toBe(`${chips.age} · ${chips.count}`)
            } else {
              expect(chips.age, `${g.id} shows no age to an adult`).toBeNull()
              expect(chips.text).toBe(chips.count)
            }
          }
        })
      }
    }
  }

  it('reads naturally: 3–6 yosh · 40 ta soʻz / 3–6 лет · 40 слов', () => {
    const def = { ages: [3, 6] as [number, number], audience: 'child' as const }
    expect(gameChips(def, { n: 40, unit: 'word' }, 'child', translator('uz', 'latn')).text).toBe('3–6 yosh · 40 ta so‘z')
    expect(gameChips(def, { n: 40, unit: 'word' }, 'child', translator('ru', 'latn')).text).toBe('3–6 лет · 40 слов')
    expect(gameChips(def, { n: 40, unit: 'word' }, 'child', translator('uzc', 'cyrl')).text).toContain('ёш')
    expect(gameChips({ ages: [2, 4], audience: 'child' }, { n: 21, unit: 'picture' }, 'child', translator('ru', 'latn')).text).toBe('2–4 года · 21 картинка')
  })
})

describe('Russian plural forms in labels', () => {
  it('picks the form by the number', () => {
    const f = (n: number) => pluralizeForms('{n} слово|слова|слов'.replace('{n}', String(n)), n)
    expect(f(1)).toBe('1 слово')
    expect(f(2)).toBe('2 слова')
    expect(f(5)).toBe('5 слов')
    expect(f(11)).toBe('11 слов')
    expect(f(21)).toBe('21 слово')
    expect(f(24)).toBe('24 слова')
    expect(f(112)).toBe('112 слов')
    expect(f(0)).toBe('0 слов')
  })
  it('leaves Uzbek strings alone', () => {
    expect(pluralizeForms('40 ta soʻz', 40)).toBe('40 ta soʻz')
  })
  it('every unit string has three Russian forms and an {n}', () => {
    for (const key of ['nWord', 'nPicture', 'nTask', 'nPair', 'nCategory', 'nNumber'] as const) {
      expect(S.ru[key], key).toMatch(/\{n\} \S+\|\S+\|\S+$/)
      expect(S.uz[key], key).toMatch(/^\{n\} ta \S+$/)
    }
    expect(S.ru.ageRange).toMatch(/\{from\}–\{to\} \S+\|\S+\|\S+$/)
  })
})

describe('the games hub shows exactly those labels', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  for (const kind of KINDS) {
    for (const lang of LANGS) {
      it(`${kind} / ${lang}: every tile carries its age and count chips and its accessible name includes them`, () => {
        useProfileStore.setState({ profile: defaultProfile({ kind, speechLang: lang }) })
        const { container } = render(
          <MemoryRouter>
            <Hub />
          </MemoryRouter>,
        )
        const t = translator('uz', 'latn')
        for (const g of gamesFor(kind)) {
          const chips = gameChips(g, gameCount(g.id, kind, lang), kind, t)
          const el = container.querySelector(`[data-testid="chips-${g.id}"]`)
          expect(el, g.id).not.toBeNull()
          // visible chips: the age chip only for children, the count chip always
          const shown = Array.from(el!.querySelectorAll('span')).map((s) => s.textContent)
          expect(shown).toEqual([chips.age, chips.count].filter(Boolean))
          const btn = within(container).getAllByRole('button').find((b) => b.getAttribute('aria-label')?.endsWith(chips.text))
          expect(btn, `${g.id}: the tile name carries the same label`).toBeDefined()
        }
        expect(screen.queryAllByTestId(/^chips-/).length).toBe(gamesFor(kind).length)
      })
    }
  }
})

describe('chips can never be clipped (style guard; e2e/labels.spec.ts measures the real boxes)', () => {
  const css = readFileSync('src/features/games/Games.module.css', 'utf8')
  const block = (sel: string) => {
    const m = new RegExp(`(^|\\n)${sel.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(css)
    return m?.[2] ?? ''
  }

  it.each(['.chip', '.hubChips'])('%s wraps instead of cutting text off', (sel) => {
    const b = block(sel)
    expect(b.length, `${sel} rule exists`).toBeGreaterThan(0)
    expect(b).not.toMatch(/white-space:\s*nowrap/)
    expect(b).not.toMatch(/text-overflow/)
    expect(b).not.toMatch(/overflow(-x|-y)?:\s*(hidden|clip)/)
    expect(b).not.toMatch(/-webkit-line-clamp|line-clamp/)
    expect(b).not.toMatch(/(^|[;\s])(width|height):\s*\d/)
  })

  it('a chip may break a very long word as a last resort and never grows past its column', () => {
    expect(block('.chip')).toMatch(/overflow-wrap:\s*anywhere/)
    expect(block('.chip')).toMatch(/max-width:\s*100%/)
    expect(block('.hubChips')).toMatch(/flex-wrap:\s*wrap/)
  })
})
