import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHECK_CONFIG } from './config'
import { allQuestions } from './questions'
import { allTips } from './tips'

/*
 * docs/screening-spec.md is the document a specialist edits. This test keeps it and the code from drifting apart:
 * every question and every tip must appear in it word for word, and the thresholds it quotes must be the real ones.
 */
const doc = readFileSync('docs/screening-spec.md', 'utf8')
const esc = (s: string) => s.replace(/\|/g, '\\|')

describe('docs/screening-spec.md matches the code', () => {
  it('lists every question in both languages, with its id', () => {
    for (const q of allQuestions()) {
      expect(doc, q.id).toContain(`\`${q.id}\``)
      expect(doc, `${q.id} uz`).toContain(esc(q.text.uz))
      expect(doc, `${q.id} ru`).toContain(esc(q.text.ru))
    }
  })

  it('lists every tip in both languages', () => {
    for (const t of allTips()) {
      expect(doc, t.id).toContain(`\`${t.id}\``)
      expect(doc, `${t.id} uz`).toContain(esc(t.body.uz))
      expect(doc, `${t.id} ru`).toContain(esc(t.body.ru))
    }
  })

  it('quotes the thresholds of CHECK_CONFIG', () => {
    const c = CHECK_CONFIG
    expect(doc).toContain(`domain:  { goodMin: ${c.domain.goodMin}, watchMin: ${c.domain.watchMin} }`)
    expect(doc).toContain(`quick:   { goodMin: ${c.quick.goodMin}, anyNoMeansLookCloser: ${c.quick.anyNoMeansLookCloser} }`)
    expect(doc).toContain(`overall: { goodMin: ${c.overall.goodMin}, watchMin: ${c.overall.watchMin}, capAtWatchIfAnyAttention: ${c.overall.capAtWatchIfAnyAttention} }`)
    expect(doc).toContain(`plan:    { minutes: ${c.plan.minutes}, maxFocus: ${c.plan.maxFocus}, whenAllGood: ${c.plan.whenAllGood} }`)
    expect(doc).toContain(`retestDays: [${c.retestDays.join(', ')}],  retestEarlyGraceDays: ${c.retestEarlyGraceDays}`)
    expect(doc).toContain(`keepResults: ${c.keepResults},  keepTickDays: ${c.keepTickDays}`)
  })

  it('says it is a draft and names what the specialist must review', () => {
    expect(doc).toContain('ЧЕРНОВИК')
    expect(doc).toContain('Что обязательно должен утвердить специалист')
    expect(CHECK_CONFIG.status).toMatch(/DRAFT/)
  })
})
