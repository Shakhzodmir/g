import { CONCERN_DOMAINS, DOMAINS } from './config'
import { adultQuestions, asdQuestions, childDetail, childQuick } from './questions'
import { buildResult, quickOutcome, type QuickOutcome } from './scoring'
import type { AgeBand, Answer, Band, CheckKind, CheckResult, CheckStage, ChildDomain, ConcernId, DomainId, Question } from './types'
import { ASD_AGE_BANDS, AGE_BANDS } from './types'

/*
 * The state machine of one screening run, as pure functions so every path is testable.
 *
 *   child : age -> concerns -> quick (5) -> quickResult -> detail (3 x 6, or narrowed) -> result
 *   asd   : age -> detail (18) -> result
 *   adult : intro -> detail (18) -> result
 * A retest skips what is already known (concerns; for a detailed baseline also the quick screen).
 */

export type RunStep = 'intro' | 'age' | 'concerns' | 'quick' | 'quickResult' | 'detail'

export interface PrevInfo {
  stage: CheckStage
  age: AgeBand | null
  concerns: ConcernId[]
  /** Domains of the previous result: a retest of a detailed check covers the same ones. */
  domains: DomainId[]
}

export interface RunState {
  kind: CheckKind
  retest: boolean
  step: RunStep
  age: AgeBand | null
  concerns: ConcernId[]
  answers: Record<string, Answer>
  /** Position inside the current question list. */
  index: number
  /** Domains of the detailed assessment (fixed when it starts). */
  domains: DomainId[]
  prev: PrevInfo | null
}

export type RunAction =
  | { type: 'start' }
  | { type: 'age'; age: AgeBand }
  | { type: 'concerns'; concerns: ConcernId[] }
  | { type: 'answer'; id: string; value: Answer }
  | { type: 'goDetail' }
  | { type: 'back' }

export const ageChoices = (kind: CheckKind): readonly AgeBand[] => (kind === 'asd' ? ASD_AGE_BANDS : kind === 'child' ? AGE_BANDS : [])

export function prevInfoOf(r: CheckResult | undefined): PrevInfo | null {
  return r ? { stage: r.stage, age: r.age, concerns: r.concerns, domains: Object.keys(r.bands) as DomainId[] } : null
}

export function initRun(kind: CheckKind, prev: PrevInfo | null = null): RunState {
  return {
    kind,
    retest: prev !== null,
    step: kind === 'adult' ? 'intro' : 'age',
    age: prev?.age ?? null,
    concerns: prev?.concerns ?? [],
    answers: {},
    index: 0,
    domains: [],
    prev,
  }
}

/**
 * Domains of the detailed child assessment: those the parent was worried about (all six for "not sure" or no choice),
 * plus every domain the quick screen did not rate "good". Canonical order.
 */
export function narrowDomains(concerns: readonly ConcernId[], quickBands: Partial<Record<DomainId, Band>> = {}): ChildDomain[] {
  const all = DOMAINS.child as readonly ChildDomain[]
  if (!concerns.length || concerns.includes('unsure')) return [...all]
  const set = new Set<ChildDomain>()
  for (const c of concerns) if (c !== 'unsure') for (const d of CONCERN_DOMAINS[c]) set.add(d)
  for (const [d, b] of Object.entries(quickBands) as Array<[DomainId, Band]>) if (b !== 'good' && (all as readonly string[]).includes(d)) set.add(d as ChildDomain)
  return all.filter((d) => set.has(d))
}

/** Every detailed question of a screening for an age (all six domains). */
export function detailQuestionsAll(kind: CheckKind, age: AgeBand | null): Question[] {
  if (kind === 'child') return age ? childDetail(age) : []
  return kind === 'asd' ? asdQuestions() : adultQuestions()
}

export function quickQuestionsOf(age: AgeBand | null): Question[] {
  return age ? childQuick(age) : []
}

/** The questions shown at the current step. */
export function questionsOf(s: RunState): Question[] {
  if (s.step === 'quick') return quickQuestionsOf(s.age)
  if (s.step === 'detail') return detailQuestionsAll(s.kind, s.age).filter((q) => s.domains.includes(q.domain))
  return []
}

/** Quick-screen outcome for the current answers (child). */
export function quickOf(s: RunState): QuickOutcome {
  return quickOutcome(quickQuestionsOf(s.age), s.answers)
}

function enterDetail(s: RunState, domains: DomainId[]): RunState {
  return { ...s, step: 'detail', domains, index: 0 }
}

function afterAge(s: RunState): RunState {
  if (s.kind === 'asd') return enterDetail(s, [...DOMAINS.asd])
  // child
  if (s.retest && s.prev?.stage === 'full') return enterDetail(s, s.prev.domains.length ? s.prev.domains : narrowDomains(s.concerns))
  if (s.retest) return { ...s, step: 'quick', index: 0 }
  return { ...s, step: 'concerns' }
}

export function runReducer(s: RunState, a: RunAction): RunState {
  switch (a.type) {
    case 'start':
      return s.step === 'intro' ? enterDetail(s, [...DOMAINS.adult]) : s
    case 'age':
      return s.step === 'age' ? afterAge({ ...s, age: a.age }) : s
    case 'concerns':
      return s.step === 'concerns' ? { ...s, concerns: a.concerns, step: 'quick', index: 0 } : s
    case 'answer': {
      if (s.step !== 'quick' && s.step !== 'detail') return s
      const list = questionsOf(s)
      const answers = { ...s.answers, [a.id]: a.value }
      if (s.index + 1 < list.length) return { ...s, answers, index: s.index + 1 }
      // the last question of the list: quick -> its result screen; detail -> the caller finishes (index stays on the last)
      return s.step === 'quick' ? { ...s, answers, step: 'quickResult', index: 0 } : { ...s, answers }
    }
    case 'goDetail': {
      if (s.step !== 'quickResult') return s
      const quick = quickOf(s)
      return enterDetail(s, narrowDomains(s.concerns, quick.bands))
    }
    case 'back':
      return back(s)
  }
}

function back(s: RunState): RunState {
  switch (s.step) {
    case 'intro':
    case 'age':
      return s
    case 'concerns':
      return { ...s, step: 'age' }
    case 'quick':
      if (s.index > 0) return { ...s, index: s.index - 1 }
      return { ...s, step: s.retest ? 'age' : 'concerns' }
    case 'quickResult': {
      const n = quickQuestionsOf(s.age).length
      return { ...s, step: 'quick', index: Math.max(0, n - 1) }
    }
    case 'detail':
      if (s.index > 0) return { ...s, index: s.index - 1 }
      if (s.kind === 'adult') return { ...s, step: 'intro' }
      if (s.kind === 'asd') return { ...s, step: 'age' }
      // child: came from the quick result, or straight from the age of a detailed retest
      return s.retest && s.prev?.stage === 'full' ? { ...s, step: 'age' } : { ...s, step: 'quickResult', index: 0 }
  }
}

/** True when every question of the detailed list has an answer. */
export function detailComplete(s: RunState): boolean {
  if (s.step !== 'detail') return false
  const list = questionsOf(s)
  return list.length > 0 && list.every((q) => s.answers[q.id] !== undefined)
}

/** Builds the stored result of a finished run. `stage` 'quick' = the parent stopped after the quick screen. */
export function finishRun(s: RunState, stage: CheckStage, ts: number): CheckResult {
  const questions = stage === 'quick' ? quickQuestionsOf(s.age) : detailQuestionsAll(s.kind, s.age).filter((q) => s.domains.includes(q.domain))
  return buildResult({ ts, stage, age: s.age, concerns: s.concerns, retest: s.retest, questions, answers: s.answers })
}

/** Position text for the progress line: "3 / 5". */
export function progressOf(s: RunState): { n: number; total: number } {
  const total = questionsOf(s).length
  return { n: Math.min(s.index + 1, Math.max(total, 1)), total }
}
