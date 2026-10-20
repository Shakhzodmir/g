import { BAND_RANK, CHECK_CONFIG } from './config'
import type { Answer, AgeBand, Band, CheckResult, CheckStage, ConcernId, DomainId, Question } from './types'

/*
 * Pure scoring. Every threshold comes from CHECK_CONFIG (config.ts); nothing here is a magic number.
 * Fractions are used for ordering only. The UI shows bands, never numbers.
 */

const P = CHECK_CONFIG.points
const pointsOf = (a: Answer): number => (a === 2 ? P.yes : a === 1 ? P.sometimes : P.no)
const MAX_PER_QUESTION = P.yes

export function bandOfFraction(f: number, t: { goodMin: number; watchMin: number } = CHECK_CONFIG.domain): Band {
  return f >= t.goodMin ? 'good' : f >= t.watchMin ? 'watch' : 'attention'
}

/** Share (0..1) of the maximum points per domain, over the answered questions only. */
export function domainFractions(questions: readonly Question[], answers: Readonly<Record<string, Answer>>): Partial<Record<DomainId, number>> {
  const sum = new Map<DomainId, { got: number; max: number }>()
  for (const q of questions) {
    const a = answers[q.id]
    if (a === undefined) continue
    const cur = sum.get(q.domain) ?? { got: 0, max: 0 }
    cur.got += pointsOf(a)
    cur.max += MAX_PER_QUESTION
    sum.set(q.domain, cur)
  }
  const out: Partial<Record<DomainId, number>> = {}
  for (const [d, v] of sum) out[d] = v.max > 0 ? v.got / v.max : 0
  return out
}

/** Overall band: band of the mean domain share, but never better than "watch" while a domain needs attention. */
export function overallBand(fr: Partial<Record<DomainId, number>>, bands: Partial<Record<DomainId, Band>>): Band {
  const values = Object.values(fr).filter((v): v is number => typeof v === 'number')
  if (!values.length) return 'good'
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  let band = bandOfFraction(mean, CHECK_CONFIG.overall)
  if (CHECK_CONFIG.overall.capAtWatchIfAnyAttention && Object.values(bands).includes('attention') && band === 'good') band = 'watch'
  return band
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000

export interface Scored {
  fr: Partial<Record<DomainId, number>>
  bands: Partial<Record<DomainId, Band>>
  overall: Band
}

/** Scores the answered questions into per-domain bands and one overall band. */
export function scoreQuestions(questions: readonly Question[], answers: Readonly<Record<string, Answer>>): Scored {
  const raw = domainFractions(questions, answers)
  const fr: Partial<Record<DomainId, number>> = {}
  const bands: Partial<Record<DomainId, Band>> = {}
  for (const [d, v] of Object.entries(raw) as Array<[DomainId, number]>) {
    fr[d] = round3(v)
    bands[d] = bandOfFraction(v)
  }
  return { fr, bands, overall: overallBand(raw, bands) }
}

export interface QuickOutcome extends Scored {
  /** True when the quick screen gives no reason to look closer. */
  onTrack: boolean
}

/** The 5-question quick screen: on track only with enough points AND no single "no" (when configured). */
export function quickOutcome(questions: readonly Question[], answers: Readonly<Record<string, Answer>>): QuickOutcome {
  const scored = scoreQuestions(questions, answers)
  let got = 0
  let max = 0
  let anyNo = false
  for (const q of questions) {
    const a = answers[q.id]
    if (a === undefined) continue
    got += pointsOf(a)
    max += MAX_PER_QUESTION
    if (a === 0) anyNo = true
  }
  const share = max > 0 ? got / max : 0
  const onTrack = share >= CHECK_CONFIG.quick.goodMin && !(CHECK_CONFIG.quick.anyNoMeansLookCloser && anyNo)
  return { ...scored, onTrack }
}

export const resultId = (ts: number): string => `r-${ts.toString(36)}`

export interface BuildResultArgs {
  ts: number
  stage: CheckStage
  age: AgeBand | null
  concerns: ConcernId[]
  retest: boolean
  /** The questions that are scored (the quick five, or the detailed ones). */
  questions: readonly Question[]
  answers: Readonly<Record<string, Answer>>
}

export function buildResult(a: BuildResultArgs): CheckResult {
  const scored = scoreQuestions(a.questions, a.answers)
  return {
    id: resultId(a.ts),
    ts: a.ts,
    stage: a.stage,
    age: a.age,
    concerns: [...a.concerns],
    retest: a.retest,
    answers: { ...a.answers },
    fr: scored.fr,
    bands: scored.bands,
    overall: scored.overall,
    cfg: CHECK_CONFIG.version,
  }
}

export function attentionDomains(r: Pick<CheckResult, 'bands'>): DomainId[] {
  return (Object.entries(r.bands) as Array<[DomainId, Band]>).filter(([, b]) => b === 'attention').map(([d]) => d)
}

export const hasAttention = (r: Pick<CheckResult, 'bands'>): boolean => attentionDomains(r).length > 0

export type Outcome = { kind: 'first' } | { kind: 'improved'; reason: 'clear' | 'bandUp' } | { kind: 'specialist' }

/**
 * Result of a repeat check against the previous one: "improved" when no domain needs attention any more or the
 * overall band moved up; otherwise the calm "consider a specialist" outcome. The first check has nothing to compare.
 */
export function evaluate(prev: CheckResult | undefined, next: CheckResult): Outcome {
  if (!prev) return { kind: 'first' }
  if (!hasAttention(next)) return { kind: 'improved', reason: 'clear' }
  if (BAND_RANK[next.overall] > BAND_RANK[prev.overall]) return { kind: 'improved', reason: 'bandUp' }
  return { kind: 'specialist' }
}

/** Domains ordered from the weakest to the strongest (band first, then the share of points). */
export function weakestFirst(r: Pick<CheckResult, 'bands' | 'fr'>): DomainId[] {
  const ids = Object.keys(r.bands) as DomainId[]
  return ids.sort((a, b) => BAND_RANK[r.bands[a]!] - BAND_RANK[r.bands[b]!] || (r.fr[a] ?? 0) - (r.fr[b] ?? 0))
}

/**
 * The domains a daily plan is built from: every domain that is not "good" (the weakest first, at most `maxFocus`);
 * when everything is good, the `whenAllGood` lowest ones so the habit has something to practise.
 */
export function focusDomains(r: Pick<CheckResult, 'bands' | 'fr'>): DomainId[] {
  const sorted = weakestFirst(r)
  const weak = sorted.filter((d) => r.bands[d] !== 'good')
  return (weak.length ? weak : sorted).slice(0, weak.length ? CHECK_CONFIG.plan.maxFocus : CHECK_CONFIG.plan.whenAllGood)
}
