import { describe, expect, it } from 'vitest'
import { CHECK_CONFIG } from './config'
import { adultQuestions, childDetail, childQuick } from './questions'
import { bandOfFraction, buildResult, domainFractions, evaluate, focusDomains, hasAttention, overallBand, quickOutcome, scoreQuestions, weakestFirst } from './scoring'
import type { Answer, Band, CheckResult, DomainId, Question } from './types'

const answerAll = (qs: readonly Question[], v: Answer | ((q: Question, i: number) => Answer)): Record<string, Answer> =>
  Object.fromEntries(qs.map((q, i) => [q.id, typeof v === 'function' ? v(q, i) : v]))

describe('bandOfFraction (thresholds come from CHECK_CONFIG)', () => {
  it('maps the share of points to three bands', () => {
    const { goodMin, watchMin } = CHECK_CONFIG.domain
    expect(bandOfFraction(1)).toBe('good')
    expect(bandOfFraction(goodMin)).toBe('good')
    expect(bandOfFraction(goodMin - 0.001)).toBe('watch')
    expect(bandOfFraction(watchMin)).toBe('watch')
    expect(bandOfFraction(watchMin - 0.001)).toBe('attention')
    expect(bandOfFraction(0)).toBe('attention')
  })

  it('for a domain of three questions: 5-6 points good, 3-4 watch, 0-2 attention', () => {
    const qs = adultQuestions().filter((q) => q.domain === 'words')
    const bandFor = (a: Answer[]): Band => scoreQuestions(qs, Object.fromEntries(qs.map((q, i) => [q.id, a[i]]))).bands.words!
    expect(bandFor([2, 2, 2])).toBe('good')
    expect(bandFor([2, 2, 1])).toBe('good')
    expect(bandFor([2, 2, 0])).toBe('watch')
    expect(bandFor([1, 1, 1])).toBe('watch')
    expect(bandFor([2, 1, 0])).toBe('watch')
    expect(bandFor([2, 0, 0])).toBe('attention')
    expect(bandFor([1, 1, 0])).toBe('attention')
    expect(bandFor([0, 0, 0])).toBe('attention')
  })
})

describe('scoreQuestions', () => {
  it('scores each domain separately', () => {
    const qs = childDetail('3-4')
    const answers = answerAll(qs, (q) => (q.domain === 'fluency' ? 0 : q.domain === 'sounds' ? 1 : 2))
    const s = scoreQuestions(qs, answers)
    expect(s.bands.fluency).toBe('attention')
    expect(s.bands.sounds).toBe('watch')
    expect(s.bands.vocab).toBe('good')
    expect(Object.keys(s.bands)).toHaveLength(6)
    expect(s.fr.fluency).toBe(0)
    expect(s.fr.vocab).toBe(1)
  })

  it('ignores unanswered questions and omits domains with no answer', () => {
    const qs = childDetail('2-3')
    const fr = domainFractions(qs, { [qs[0].id]: 2, [qs[1].id]: 0 })
    expect(Object.keys(fr)).toEqual(['vocab'])
    expect(fr.vocab).toBe(0.5)
  })

  it('overall is never better than "watch" while a domain needs attention', () => {
    const qs = childDetail('3-4')
    const answers = answerAll(qs, (q) => (q.domain === 'fluency' ? 0 : 2))
    const s = scoreQuestions(qs, answers)
    expect(s.bands.fluency).toBe('attention')
    // mean share is 15/18 = 0.83 (good) but a domain needs attention
    expect(s.overall).toBe('watch')
  })

  it('all yes is good overall, all no is "attention" overall', () => {
    const qs = adultQuestions()
    expect(scoreQuestions(qs, answerAll(qs, 2)).overall).toBe('good')
    expect(scoreQuestions(qs, answerAll(qs, 0)).overall).toBe('attention')
    expect(scoreQuestions(qs, answerAll(qs, 1)).overall).toBe('watch')
  })

  it('overallBand of nothing is good (no data, no alarm)', () => {
    expect(overallBand({}, {})).toBe('good')
  })
})

describe('quick screen', () => {
  const qs = childQuick('3-4')
  it('all yes is on track', () => {
    expect(quickOutcome(qs, answerAll(qs, 2)).onTrack).toBe(true)
  })
  it('4 yes + 1 sometimes is still on track (9 of 10)', () => {
    expect(quickOutcome(qs, answerAll(qs, (_q, i) => (i === 0 ? 1 : 2))).onTrack).toBe(true)
  })
  it('a single "no" is enough to look closer, even with 8 of 10 points', () => {
    const o = quickOutcome(qs, answerAll(qs, (_q, i) => (i === 0 ? 0 : 2)))
    expect(o.onTrack).toBe(false)
  })
  it('three "sometimes" is not on track', () => {
    expect(quickOutcome(qs, answerAll(qs, (_q, i) => (i < 3 ? 1 : 2))).onTrack).toBe(false)
  })
  it('exposes the bands of the domains it asked about', () => {
    const o = quickOutcome(qs, answerAll(qs, (q) => (q.domain === 'fluency' ? 0 : 2)))
    expect(o.bands.fluency).toBe('attention')
    expect(o.bands.vocab).toBe('good')
  })
})

describe('buildResult', () => {
  it('stores bands, fractions and the config version, but no percentages as text', () => {
    const qs = adultQuestions()
    const r = buildResult({ ts: 1_700_000_000_000, stage: 'full', age: null, concerns: [], retest: false, questions: qs, answers: answerAll(qs, 2) })
    expect(r.cfg).toBe(CHECK_CONFIG.version)
    expect(r.overall).toBe('good')
    expect(r.id).toMatch(/^r-[a-z0-9]+$/)
    expect(r.stage).toBe('full')
  })
})

function result(bands: Partial<Record<DomainId, Band>>, overall: Band, fr: Partial<Record<DomainId, number>> = {}): CheckResult {
  return { id: 'r', ts: 1, stage: 'full', age: '3-4', concerns: [], retest: false, answers: {}, fr, bands, overall, cfg: 1 }
}

describe('evaluate (retest outcome)', () => {
  const prev = result({ vocab: 'attention', sounds: 'watch' }, 'attention')
  it('is "first" without a previous result', () => {
    expect(evaluate(undefined, prev)).toEqual({ kind: 'first' })
  })
  it('is improved when no domain needs attention any more', () => {
    expect(evaluate(prev, result({ vocab: 'watch', sounds: 'good' }, 'watch'))).toEqual({ kind: 'improved', reason: 'clear' })
  })
  it('is improved when the overall band moves up even though a domain still needs attention', () => {
    const before = result({ vocab: 'attention', sounds: 'attention' }, 'attention')
    expect(evaluate(before, result({ vocab: 'attention', sounds: 'good' }, 'watch'))).toEqual({ kind: 'improved', reason: 'bandUp' })
  })
  it('otherwise points calmly to a specialist', () => {
    expect(evaluate(prev, result({ vocab: 'attention', sounds: 'watch' }, 'attention'))).toEqual({ kind: 'specialist' })
    expect(evaluate(result({ vocab: 'attention' }, 'watch'), result({ vocab: 'attention' }, 'attention'))).toEqual({ kind: 'specialist' })
  })
  it('hasAttention', () => {
    expect(hasAttention(prev)).toBe(true)
    expect(hasAttention(result({ vocab: 'good' }, 'good'))).toBe(false)
  })
})

describe('focus domains for the plan', () => {
  it('orders the weakest first: band, then share of points', () => {
    const r = result({ vocab: 'watch', sounds: 'attention', fluency: 'attention', attention: 'good' }, 'attention', { vocab: 0.6, sounds: 0.33, fluency: 0.0, attention: 1 })
    expect(weakestFirst(r)).toEqual(['fluency', 'sounds', 'vocab', 'attention'])
  })
  it('takes every weak domain up to the maximum', () => {
    const r = result({ a: 'attention', b: 'watch', c: 'watch', d: 'watch', e: 'good' } as never, 'watch', { a: 0.1, b: 0.5, c: 0.6, d: 0.7, e: 1 } as never)
    expect(focusDomains(r)).toHaveLength(CHECK_CONFIG.plan.maxFocus)
    expect(focusDomains(r)[0]).toBe('a')
    expect(focusDomains(r)).not.toContain('e')
  })
  it('keeps the habit going with the lowest domains when everything is good', () => {
    const r = result({ vocab: 'good', sounds: 'good', fluency: 'good' }, 'good', { vocab: 0.9, sounds: 0.83, fluency: 1 })
    expect(focusDomains(r)).toEqual(['sounds', 'vocab'])
  })
})
