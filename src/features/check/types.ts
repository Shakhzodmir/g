import type { Bi } from '../../i18n/types'

/** The three separate screenings. Each has its own questions, domains, history, plan and retest schedule. */
export type CheckKind = 'child' | 'asd' | 'adult'
export const CHECK_KINDS: readonly CheckKind[] = ['child', 'asd', 'adult']

/** Age groups of the child screenings. `asd` uses the first four only. */
export type AgeBand = '1-2' | '2-3' | '3-4' | '4-5' | '5-7'
export const AGE_BANDS: readonly AgeBand[] = ['1-2', '2-3', '3-4', '4-5', '5-7']
export const ASD_AGE_BANDS: readonly AgeBand[] = ['1-2', '2-3', '3-4', '4-5']

export type ChildDomain = 'vocab' | 'sounds' | 'understanding' | 'fluency' | 'attention' | 'articulation'
export type AsdDomain = 'joint' | 'name' | 'pointing' | 'imitation' | 'play' | 'sensory'
export type AdultDomain = 'understanding' | 'words' | 'clarity' | 'fluency' | 'reading' | 'memory'
export type DomainId = ChildDomain | AsdDomain | AdultDomain

/** 2 = yes, 1 = sometimes, 0 = no. Every question is worded so that "yes" is the good answer. */
export type Answer = 0 | 1 | 2

/** Qualitative band of one domain (or of the whole check). Never shown as a number, never called "risk". */
export type Band = 'good' | 'watch' | 'attention'

/** What worries the parent (child screening). Narrows the detailed assessment. */
export type ConcernId = 'little' | 'sounds' | 'understand' | 'fluency' | 'contact' | 'mouth' | 'unsure'

export interface Question {
  /** Stable id, also the key in a stored result (`cq.a1.1`, `cd.a1.vocab.2`, `as.joint.1`, `ad.words.3`). */
  id: string
  domain: DomainId
  text: Bi
}

/** `quick` = only the 5-question screen was taken; `full` = the detailed six-domain assessment. */
export type CheckStage = 'quick' | 'full'

export interface CheckResult {
  id: string
  ts: number
  stage: CheckStage
  age: AgeBand | null
  concerns: ConcernId[]
  /** True for a repeat check inside a running plan (7/14/30 days), false for a fresh start. */
  retest: boolean
  answers: Record<string, Answer>
  /** Fraction of the maximum points per domain (0..1). Used only for ordering; never shown. */
  fr: Partial<Record<DomainId, number>>
  bands: Partial<Record<DomainId, Band>>
  overall: Band
  /** Version of the thresholds the bands were computed with (CHECK_CONFIG.version). */
  cfg: number
}

export interface CheckPlan {
  /** When the plan (and its 7/14/30 day schedule) started. */
  startedTs: number
  baselineResultId: string
  /** The weakest domains the daily plan is built from (refreshed after each retest). */
  focus: DomainId[]
}

/** One row per profile and kind: results, the current plan and the "done" ticks. */
export interface CheckRow {
  /** `${profileId}:${kind}` */
  id: string
  profileId: string
  kind: CheckKind
  /** Oldest first. */
  results: CheckResult[]
  plan: CheckPlan | null
  /** Local day (`YYYY-MM-DD`) -> ids of the plan tasks ticked that day. */
  ticks: Record<string, string[]>
  updatedAt: number
}

export const rowId = (profileId: string, kind: CheckKind): string => `${profileId}:${kind}`

/** A link into the app from the plan. Resolved to a route by plan.ts, validated against the real registries in tests. */
export type AppTarget =
  | { type: 'game'; id: string }
  | { type: 'feature'; id: 'aac' | 'schedule' | 'timer' | 'calm' | 'feelings' | 'stories' | 'exercises'; sub?: string }

export interface TipDef {
  id: string
  domain: DomainId
  minutes: number
  title: Bi
  body: Bi
}

export interface AppTaskDef {
  id: string
  domain: DomainId
  minutes: number
  target: AppTarget
}
