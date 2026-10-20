import type { StrKey } from './strings'
import type { AgeBand, Band, CheckKind, ConcernId, DomainId } from './types'

/** Typed lookups from ids to interface-string keys (kept in one place so the screens and the report agree). */
export const bandKey = (b: Band): StrKey => (b === 'good' ? 'bandGood' : b === 'watch' ? 'bandWatch' : 'bandAttention')
export const domainKey = (d: DomainId): StrKey => `d_${d}`
export const ageKey = (a: AgeBand): StrKey => `age_${a.replace('-', '_')}` as StrKey
export const concernKey = (c: ConcernId): StrKey => `c_${c}`
export const kindTitleKey = (k: CheckKind): StrKey => (k === 'child' ? 'kindChild' : k === 'asd' ? 'kindAsd' : 'kindAdult')
export const kindHintKey = (k: CheckKind): StrKey => (k === 'child' ? 'kindChildHint' : k === 'asd' ? 'kindAsdHint' : 'kindAdultHint')
export const whereKeys = (k: CheckKind): StrKey[] =>
  k === 'child' ? ['whereChild1', 'whereChild2', 'whereChild3'] : k === 'asd' ? ['whereAsd1', 'whereAsd2', 'whereAsd3'] : ['whereAdult1', 'whereAdult2', 'whereAdult3']
export const disclaimerKeys = (k: CheckKind): StrKey[] => (k === 'asd' ? ['disclaimer', 'disclaimerAsd'] : ['disclaimer', 'disclaimerText'])
export const warnKey = (k: CheckKind): StrKey => (k === 'adult' ? 'warnAdult' : 'warnChild')

export const CONCERN_ORDER: readonly ConcernId[] = ['little', 'sounds', 'understand', 'fluency', 'contact', 'mouth', 'unsure']
