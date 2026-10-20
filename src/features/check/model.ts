import { CHECK_CONFIG, DOMAINS } from './config'
import { dayKey, dayNumberOfKey } from './days'
import { focusDomains } from './scoring'
import { AGE_BANDS, CHECK_KINDS, rowId, type AgeBand, type Answer, type Band, type CheckKind, type CheckPlan, type CheckResult, type CheckRow, type ConcernId, type DomainId } from './types'

/*
 * Pure operations on a stored row (one per profile and kind) and the sanitiser that rebuilds a row from untrusted
 * input (a backup file). Nothing here touches IndexedDB.
 */

export function emptyRow(profileId: string, kind: CheckKind, now = 0): CheckRow {
  return { id: rowId(profileId, kind), profileId, kind, results: [], plan: null, ticks: {}, updatedAt: now }
}

/** Keeps only the most recent `keepTickDays` days of ticks. */
export function pruneTicks(ticks: Readonly<Record<string, string[]>>): Record<string, string[]> {
  const keys = Object.keys(ticks).sort()
  const keep = keys.slice(Math.max(0, keys.length - CHECK_CONFIG.keepTickDays))
  const out: Record<string, string[]> = {}
  for (const k of keep) out[k] = ticks[k]
  return out
}

/**
 * Adds a finished check. A fresh start (or a repeat check with no running plan) begins a new plan and a new 7/14/30
 * day schedule; a repeat check inside a running plan keeps the schedule and only refreshes the focus domains.
 */
export function addResult(row: CheckRow, result: CheckResult): CheckRow {
  const results = [...row.results, result].slice(-CHECK_CONFIG.keepResults)
  const focus = focusDomains(result)
  const plan: CheckPlan = result.retest && row.plan ? { ...row.plan, focus } : { startedTs: result.ts, baselineResultId: result.id, focus }
  return { ...row, results, plan, updatedAt: result.ts }
}

/** Ticks or un-ticks a task for a day. */
export function toggleTick(row: CheckRow, day: string, taskId: string, now: number): CheckRow {
  const current = row.ticks[day] ?? []
  const next = current.includes(taskId) ? current.filter((x) => x !== taskId) : [...current, taskId]
  const ticks = { ...row.ticks }
  if (next.length) ticks[day] = next
  else delete ticks[day]
  return { ...row, ticks: pruneTicks(ticks), updatedAt: now }
}

export const latestResult = (row: CheckRow | undefined): CheckResult | undefined => row?.results[row.results.length - 1]

export const todayKey = (now: number): string => dayKey(now)

// ---------------------------------------------------------------------------------------------------------------
// Sanitiser (backup import)
// ---------------------------------------------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finiteTs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 8.64e15
const ID = /^[a-z0-9_.-]{1,40}$/i
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])
const DOMAIN_IDS = new Set<string>(CHECK_KINDS.flatMap((k) => DOMAINS[k]))
const CONCERNS: readonly ConcernId[] = ['little', 'sounds', 'understand', 'fluency', 'contact', 'mouth', 'unsure']
const BANDS: readonly Band[] = ['good', 'watch', 'attention']
const MAX_ANSWERS = 80
const MAX_TICK_IDS_PER_DAY = 12

function sanitizeResult(raw: unknown): CheckResult | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !ID.test(raw.id) || FORBIDDEN.has(raw.id) || !finiteTs(raw.ts)) return null
  if (raw.stage !== 'quick' && raw.stage !== 'full') return null
  const age: AgeBand | null = typeof raw.age === 'string' && (AGE_BANDS as readonly string[]).includes(raw.age) ? (raw.age as AgeBand) : null
  const concerns = Array.isArray(raw.concerns) ? raw.concerns.filter((c): c is ConcernId => typeof c === 'string' && (CONCERNS as readonly string[]).includes(c)).slice(0, CONCERNS.length) : []
  const answers: Record<string, Answer> = {}
  if (isObj(raw.answers)) {
    let n = 0
    for (const [k, v] of Object.entries(raw.answers)) {
      if (++n > MAX_ANSWERS) break
      if (ID.test(k) && !FORBIDDEN.has(k) && (v === 0 || v === 1 || v === 2)) answers[k] = v
    }
  }
  const bands: Partial<Record<DomainId, Band>> = {}
  const fr: Partial<Record<DomainId, number>> = {}
  if (isObj(raw.bands)) {
    for (const [k, v] of Object.entries(raw.bands)) {
      if (DOMAIN_IDS.has(k) && typeof v === 'string' && (BANDS as readonly string[]).includes(v)) {
        bands[k as DomainId] = v as Band
        const f = isObj(raw.fr) ? raw.fr[k] : undefined
        fr[k as DomainId] = typeof f === 'number' && Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : v === 'good' ? 1 : v === 'watch' ? 0.65 : 0.25
      }
    }
  }
  if (!Object.keys(bands).length) return null
  const overall: Band = typeof raw.overall === 'string' && (BANDS as readonly string[]).includes(raw.overall) ? (raw.overall as Band) : 'watch'
  return {
    id: raw.id,
    ts: raw.ts,
    stage: raw.stage,
    age,
    concerns,
    retest: raw.retest === true,
    answers,
    fr,
    bands,
    overall,
    cfg: typeof raw.cfg === 'number' && Number.isFinite(raw.cfg) ? Math.max(0, Math.min(1000, Math.floor(raw.cfg))) : 0,
  }
}

function sanitizePlan(raw: unknown): CheckPlan | null {
  if (!isObj(raw) || !finiteTs(raw.startedTs) || typeof raw.baselineResultId !== 'string' || !ID.test(raw.baselineResultId)) return null
  const focus = Array.isArray(raw.focus) ? raw.focus.filter((d): d is DomainId => typeof d === 'string' && DOMAIN_IDS.has(d)).slice(0, 6) : []
  return { startedTs: raw.startedTs, baselineResultId: raw.baselineResultId, focus }
}

function sanitizeTicks(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!isObj(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    if (dayNumberOfKey(k) === null || !Array.isArray(v)) continue
    const ids = [...new Set(v.filter((x): x is string => typeof x === 'string' && ID.test(x) && !FORBIDDEN.has(x)))].slice(0, MAX_TICK_IDS_PER_DAY)
    if (ids.length) out[k] = ids
  }
  return pruneTicks(out)
}

/** Rebuilds one row from untrusted input; the profile id and the key are always taken from the caller, never from the file. */
export function sanitizeRow(raw: unknown, profileId: string): CheckRow | null {
  if (!isObj(raw) || typeof raw.kind !== 'string' || !(CHECK_KINDS as readonly string[]).includes(raw.kind)) return null
  const kind = raw.kind as CheckKind
  const results = (Array.isArray(raw.results) ? raw.results : [])
    .slice(-CHECK_CONFIG.keepResults)
    .map(sanitizeResult)
    .filter((r): r is CheckResult => r !== null)
  const seen = new Set<string>()
  const unique = results.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).sort((a, b) => a.ts - b.ts)
  return {
    id: rowId(profileId, kind),
    profileId,
    kind,
    results: unique,
    plan: sanitizePlan(raw.plan),
    ticks: sanitizeTicks(raw.ticks),
    updatedAt: finiteTs(raw.updatedAt) ? raw.updatedAt : 0,
  }
}
