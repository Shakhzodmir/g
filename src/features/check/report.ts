import { DOMAINS } from './config'
import { dayNumber, formatDay } from './days'
import { ageKey, bandKey, disclaimerKeys, domainKey, kindTitleKey } from './labels'
import type { Outcome } from './scoring'
import type { StrKey } from './strings'
import type { Band, CheckKind, CheckResult, DomainId } from './types'

/*
 * The one-page report and the text that is shared. Both are built from the same input and the same two-language
 * labels (the interface language first, then the other one), so a specialist who reads Russian or Uzbek understands
 * either. No raw percentages and no word "risk": only the three bands, in words.
 */

export type Tr = (key: StrKey, lang: 'uz' | 'ru', vars?: Record<string, string | number>) => string

export interface ReportInput {
  kind: CheckKind
  /** Only when the adult chose to include it. */
  name: string | null
  result: CheckResult
  outcome: Outcome
  /** The last few results, oldest first, the latest included. */
  history: readonly CheckResult[]
  /** Days with at least one ticked task in the window. */
  practicedDays: number
  windowDays: number
  focus: readonly DomainId[]
}

export const HISTORY_ROWS = 5
export const REPORT_WINDOW_DAYS = 14

/** Domains of the result in the canonical order of the screening. */
export function reportDomains(result: Pick<CheckResult, 'bands'>, kind: CheckKind): Array<{ domain: DomainId; band: Band }> {
  const order = DOMAINS[kind]
  return (Object.entries(result.bands) as Array<[DomainId, Band]>)
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([domain, band]) => ({ domain, band }))
}

export const dayOf = (ts: number): string => formatDay(dayNumber(ts))

/** "uz / ru" of one key. */
export function both(tr: Tr, primary: 'uz' | 'ru', secondary: 'uz' | 'ru', key: StrKey, vars?: Record<string, string | number>): string {
  return `${tr(key, primary, vars)} / ${tr(key, secondary, vars)}`
}

/** The plain-text report (what "Share", "Copy" and the Telegram link carry). */
export function buildReportText(input: ReportInput, tr: Tr, primary: 'uz' | 'ru' = 'uz', secondary: 'uz' | 'ru' = 'ru'): string {
  const b = (key: StrKey, vars?: Record<string, string | number>) => both(tr, primary, secondary, key, vars)
  const lines: string[] = []
  lines.push(b('title'))
  lines.push(b(kindTitleKey(input.kind)))
  const age = input.result.age
  if (age) lines.push(`${tr('ageLabel', primary, { age: tr(ageKey(age), primary) })} / ${tr('ageLabel', secondary, { age: tr(ageKey(age), secondary) })}`)
  const date = dayOf(input.result.ts)
  lines.push(b('rpDate', { date }))
  if (input.name) lines.push(tr('rpName', primary, { name: input.name }))
  lines.push('')
  lines.push(`${b('byDomain')}:`)
  for (const { domain, band } of reportDomains(input.result, input.kind)) lines.push(`- ${b(domainKey(domain))}: ${b(bandKey(band))}`)
  lines.push(`${b('overallLine')}: ${b(bandKey(input.result.overall))}`)
  if (input.history.length > 1) {
    lines.push('')
    lines.push(`${b('rpTrend')}:`)
    for (const r of input.history.slice(-HISTORY_ROWS)) lines.push(`- ${dayOf(r.ts)}: ${b(bandKey(r.overall))}`)
  }
  lines.push('')
  lines.push(b('rpPractice', { n: input.practicedDays, window: input.windowDays }))
  lines.push('')
  const [d1, d2] = disclaimerKeys(input.kind)
  lines.push(b(d1))
  lines.push(b(d2))
  lines.push(b('rpFooter'))
  return lines.join('\n')
}

/** Telegram's share page: https://t.me/share/url?url=...&text=... (the user still has to press "send" there). */
export function telegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
}
