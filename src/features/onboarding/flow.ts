import type { AgeGroup } from '../../store/profileTypes'

/*
 * Pure logic of the onboarding wizard. The step lives in the URL (#/onboarding?step=name), so the browser/Android
 * Back button goes to the previous step instead of leaving the app, and a reload resumes the same step.
 */

export type Step = 'lang' | 'who' | 'name' | 'info'
export type Kind = 'child' | 'adult'

export const STEPS: Step[] = ['lang', 'who', 'name', 'info']
export const INFO_PAGES = 3
export const AGE_GROUPS: AgeGroup[] = ['2-4', '5-7', '8-12', '13+']

export interface Draft {
  kind: Kind
  name: string
  ageGroup: AgeGroup
}

export interface Position {
  step: Step
  /** Page of the info step, 0-based. */
  info: number
}

export function defaultAge(kind: Kind): AgeGroup {
  return kind === 'adult' ? '13+' : '5-7'
}

export function emptyDraft(): Draft {
  return { kind: 'child', name: '', ageGroup: defaultAge('child') }
}

/** Reads `?step=name&i=1`; anything unknown falls back to the first step. */
export function parsePosition(search: string): Position {
  const q = new URLSearchParams(search)
  const raw = q.get('step')
  const step = (STEPS as string[]).includes(raw ?? '') ? (raw as Step) : 'lang'
  const i = Number(q.get('i'))
  const info = step === 'info' && Number.isInteger(i) ? Math.min(INFO_PAGES - 1, Math.max(0, i)) : 0
  return { step, info }
}

export function positionSearch(p: Position): string {
  if (p.step === 'lang') return ''
  return p.step === 'info' ? `?step=info&i=${p.info}` : `?step=${p.step}`
}

export function nameValid(name: string): boolean {
  return name.trim().length > 0
}

/**
 * Where the wizard may actually be. A reload (or a hand-edited URL) can ask for a step whose answers were never
 * given: the info pages need a name, so without one the wizard goes back to the name step.
 */
export function allowedPosition(want: Position, draft: Draft): Position {
  if (want.step === 'info' && !nameValid(draft.name)) return { step: 'name', info: 0 }
  return want
}

/** The previous place in the wizard, or null on the first step. */
export function previousPosition(p: Position): Position | null {
  if (p.step === 'lang') return null
  if (p.step === 'who') return { step: 'lang', info: 0 }
  if (p.step === 'name') return { step: 'who', info: 0 }
  if (p.info > 0) return { step: 'info', info: p.info - 1 }
  return { step: 'name', info: 0 }
}

/** Age group saved with the profile: asked for children, '13+' for adults. */
export function profileAge(draft: Draft): AgeGroup {
  return draft.kind === 'adult' ? '13+' : draft.ageGroup
}

export function isAgeGroup(v: unknown): v is AgeGroup {
  return typeof v === 'string' && (AGE_GROUPS as string[]).includes(v)
}

/** Draft kept in sessionStorage so a reload mid-way keeps the answers (the language is in the device store). */
export function parseDraft(raw: string | null): Draft {
  const base = emptyDraft()
  if (!raw) return base
  try {
    const v = JSON.parse(raw) as Partial<Draft>
    const kind: Kind = v.kind === 'adult' ? 'adult' : 'child'
    return {
      kind,
      name: typeof v.name === 'string' ? v.name.slice(0, 30) : '',
      ageGroup: isAgeGroup(v.ageGroup) ? v.ageGroup : defaultAge(kind),
    }
  } catch {
    return base
  }
}

/** Steps to rewind so the finished wizard leaves no onboarding entries behind Home. */
export function rewindDepth(currentIdx: unknown, startIdx: unknown): number {
  if (typeof currentIdx !== 'number' || typeof startIdx !== 'number') return 0
  return Math.max(0, currentIdx - startIdx)
}
