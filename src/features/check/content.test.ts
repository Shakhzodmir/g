import { describe, expect, it } from 'vitest'
import { FEATURES, featureAllowed } from '../../app/features'
import { displayUz } from '../../i18n/orthography'
import { GAMES } from '../games/registry'
import { CONCERN_DOMAINS, DOMAINS } from './config'
import { routeOf } from './plan'
import { adultQuestions, allQuestions, asdQuestions, childDetail, childQuick } from './questions'
import { S } from './strings'
import { allTips, APP_HINTS, appTasksFor, tipsFor } from './tips'
import { AGE_BANDS, CHECK_KINDS, type AppTarget, type CheckKind } from './types'

const FORBIDDEN_UZ = /['‘’`]/
const FORBIDDEN_WORDS = /risk|xavf|риск|диагноз қўй/i

describe('question bank', () => {
  it('has 5 quick + 6 domains x 3 detailed questions for every child age', () => {
    for (const age of AGE_BANDS) {
      expect(childQuick(age)).toHaveLength(5)
      const detail = childDetail(age)
      expect(detail).toHaveLength(18)
      for (const d of DOMAINS.child) expect(detail.filter((q) => q.domain === d)).toHaveLength(3)
    }
  })

  it('has 6 domains x 3 questions for the communication and the adult check', () => {
    for (const [qs, kind] of [[asdQuestions(), 'asd'], [adultQuestions(), 'adult']] as const) {
      expect(qs).toHaveLength(18)
      for (const d of DOMAINS[kind]) expect(qs.filter((q) => q.domain === d)).toHaveLength(3)
    }
  })

  it('quick questions cover at least four different domains per age and only use child domains', () => {
    for (const age of AGE_BANDS) {
      const ds = new Set(childQuick(age).map((q) => q.domain))
      expect(ds.size).toBeGreaterThanOrEqual(4)
      for (const d of ds) expect((DOMAINS.child as readonly string[]).includes(d)).toBe(true)
    }
  })

  it('has unique ids that carry their domain', () => {
    const all = allQuestions()
    const ids = all.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of all) if (q.id.startsWith('cd.') || q.id.startsWith('as.') || q.id.startsWith('ad.')) expect(q.id).toContain(`.${q.domain}.`)
    for (const q of all) expect(q.id).toMatch(/^[a-z0-9_.-]{1,40}$/)
  })

  it('every question is a non-empty question in both languages with clean Uzbek letters', () => {
    for (const q of allQuestions()) {
      expect(q.text.uz.trim(), q.id).not.toBe('')
      expect(q.text.ru.trim(), q.id).not.toBe('')
      expect(q.text.uz, q.id).not.toMatch(FORBIDDEN_UZ)
      expect(q.text.uz.endsWith('?'), q.id).toBe(true)
      expect(q.text.ru.endsWith('?'), q.id).toBe(true)
      expect(q.text.uz.length, q.id).toBeLessThanOrEqual(140)
      expect(q.text.ru.length, q.id).toBeLessThanOrEqual(140)
      expect(q.text.uz + q.text.ru, q.id).not.toMatch(FORBIDDEN_WORDS)
    }
  })

  it('no two questions of one age share the same wording', () => {
    const seen = new Set<string>()
    for (const q of allQuestions()) {
      expect(seen.has(q.text.uz), q.text.uz).toBe(false)
      seen.add(q.text.uz)
    }
  })

  it('concerns map only to real child domains', () => {
    for (const ds of Object.values(CONCERN_DOMAINS)) for (const d of ds) expect((DOMAINS.child as readonly string[]).includes(d)).toBe(true)
  })
})

describe('tips and app activities', () => {
  it('has at least three tips and three app activities for every domain of every screening', () => {
    for (const kind of CHECK_KINDS) {
      for (const d of DOMAINS[kind]) {
        expect(tipsFor(kind, d).length, `${kind}.${d} tips`).toBeGreaterThanOrEqual(3)
        expect(appTasksFor(kind, d).length, `${kind}.${d} apps`).toBeGreaterThanOrEqual(3)
        expect(APP_HINTS[kind][d], `${kind}.${d} hint`).toBeTruthy()
      }
    }
  })

  it('tips are short, timed 3 to 5 minutes, clean Uzbek, and unique', () => {
    const tips = allTips()
    expect(new Set(tips.map((t) => t.id)).size).toBe(tips.length)
    for (const t of tips) {
      expect(t.minutes, t.id).toBeGreaterThanOrEqual(3)
      expect(t.minutes, t.id).toBeLessThanOrEqual(5)
      for (const s of [t.title.uz, t.title.ru, t.body.uz, t.body.ru]) expect(s.trim(), t.id).not.toBe('')
      expect(t.title.uz + t.body.uz, t.id).not.toMatch(FORBIDDEN_UZ)
      expect(t.body.uz.length, t.id).toBeLessThanOrEqual(220)
      expect(t.body.uz + t.body.ru + t.title.uz + t.title.ru, t.id).not.toMatch(FORBIDDEN_WORDS)
    }
  })

  it('every app activity links to a route that exists for that kind of profile', () => {
    const exerciseSubs = new Set(['/blow', '/voice', '/mirror'])
    for (const kind of CHECK_KINDS) {
      const audience: 'child' | 'adult' = kind === 'adult' ? 'adult' : 'child'
      for (const d of DOMAINS[kind]) {
        for (const a of appTasksFor(kind, d)) {
          const t: AppTarget = a.target
          if (t.type === 'game') {
            const game = GAMES.find((g) => g.id === t.id)
            expect(game, `${a.id}: game ${t.id}`).toBeTruthy()
            expect(game!.audience === 'both' || game!.audience === audience, `${a.id}: ${t.id} is not for ${audience}`).toBe(true)
          } else {
            const f = FEATURES[t.id]
            expect(f, `${a.id}: feature ${t.id}`).toBeTruthy()
            expect(featureAllowed(f, audience), `${a.id}: ${t.id} is not for ${audience}`).toBe(true)
            if (t.id === 'exercises') expect(t.sub === undefined || exerciseSubs.has(t.sub), `${a.id}: ${t.sub}`).toBe(true)
            else if (t.id === 'aac') expect(t.sub === undefined || t.sub === '?mode=keyboard', `${a.id}: ${t.sub}`).toBe(true)
            else expect(t.sub, a.id).toBeUndefined()
          }
          expect(routeOf(t)).toMatch(/^\/[a-z]/)
          expect(a.minutes).toBeGreaterThanOrEqual(3)
          expect(a.minutes).toBeLessThanOrEqual(5)
        }
      }
    }
  })
})

describe('orthography: every Uzbek text converts to Cyrillic and to the 2026 Latin alphabet', () => {
  const uzTexts = (): string[] => {
    const out: string[] = []
    for (const q of allQuestions()) out.push(q.text.uz)
    for (const t of allTips()) out.push(t.title.uz, t.body.uz)
    for (const kind of CHECK_KINDS as readonly CheckKind[]) for (const h of Object.values(APP_HINTS[kind])) out.push(h.uz)
    for (const [k, v] of Object.entries(S.uz)) out.push(v.replace(/\{\w+\}/g, k.startsWith('d_') ? '' : '1'))
    return out
  }

  it('Cyrillic output has no Latin letters left and keeps the sentence', () => {
    for (const text of uzTexts()) {
      const cyr = displayUz(text, 'cyrl')
      // A4 and the brand name are kept-Latin tokens by design (see KEEP_LATIN_WORDS)
      expect(cyr.replace(/\b(A4|Gapimiz)\b/g, ''), text).not.toMatch(/[A-Za-z]/)
      expect(cyr, text).not.toMatch(/[ʻʼ'‘’]/)
      expect(cyr.length, text).toBeGreaterThan(0)
    }
  })

  it('2026 Latin output has no U+02BB left (oʻ → ö, gʻ → ğ)', () => {
    for (const text of uzTexts()) {
      const l26 = displayUz(text, 'latn2026')
      expect(l26, text).not.toMatch(/ʻ/)
    }
  })

  it('spot checks of the real wording', () => {
    expect(displayUz('Bu tibbiy tashxis emas.', 'cyrl')).toBe('Бу тиббий ташхис эмас.')
    expect(displayUz(S.uz.bandAttention, 'cyrl')).toBe('Эътибор керак')
    expect(displayUz('Soʻz boyligi va gaplar', 'cyrl')).toBe('Сўз бойлиги ва гаплар')
    expect(displayUz('Oʻyin', 'latn2026')).toBe('Öyin')
  })
})

describe('interface strings', () => {
  it('say plainly that this is not a diagnosis, in both languages, and never use the word risk', () => {
    expect(S.uz.disclaimer).toBe('Bu tibbiy tashxis emas.')
    expect(S.ru.disclaimer).toBe('Это не медицинский диагноз.')
    expect(S.uz.disclaimerAsd).toMatch(/autizmni aniqlamaydi/)
    expect(S.ru.disclaimerAsd).toMatch(/не определяет аутизм/)
    expect(S.uz.disclaimerAsd).toMatch(/validatsiya/)
    expect(S.ru.disclaimerAsd).toMatch(/валидированного/)
    for (const lang of ['uz', 'ru'] as const) for (const v of Object.values(S[lang])) expect(v).not.toMatch(FORBIDDEN_WORDS)
  })

  it('names the three bands as specified', () => {
    expect([S.uz.bandGood, S.uz.bandWatch, S.uz.bandAttention]).toEqual(['Yaxshi', 'Kuzatamiz', 'Eʼtibor kerak'])
    expect([S.ru.bandGood, S.ru.bandWatch, S.ru.bandAttention]).toEqual(['Хорошо', 'Наблюдаем', 'Нужно внимание'])
  })

  it('has a title for every domain of every screening', () => {
    for (const kind of CHECK_KINDS) for (const d of DOMAINS[kind]) expect((S.uz as Record<string, string>)[`d_${d}`], d).toBeTruthy()
  })

  it('shows no percentages', () => {
    for (const lang of ['uz', 'ru'] as const) for (const v of Object.values(S[lang])) expect(v).not.toMatch(/\d\s?%/)
  })
})
