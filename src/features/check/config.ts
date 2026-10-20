import type { AdultDomain, Answer, AsdDomain, Band, CheckKind, ChildDomain, ConcernId, DomainId } from './types'

/**
 * ONE place for every threshold of "Nutq tekshiruvi / Проверка речи".
 *
 * !!! DRAFT. These numbers are NOT validated. They were chosen for a calm, cautious screening and MUST be reviewed
 * by a speech-language pathologist (and, for the communication check, a child neurologist / developmental
 * paediatrician) before the feature is released. See docs/screening-spec.md ("Что должен утвердить специалист").
 *
 * Nothing here is shown to the user as a number. The user only ever sees the three bands.
 */
export const CHECK_CONFIG = {
  /** Bump when a threshold changes: every stored result remembers the version it was computed with. */
  version: 1,
  status: 'DRAFT: thresholds not validated by a specialist',

  /** Points per answer (yes / sometimes / no). */
  points: { yes: 2, sometimes: 1, no: 0 } as const satisfies Record<'yes' | 'sometimes' | 'no', Answer>,

  /**
   * Band of one domain = share of the maximum points.
   *   fraction >= goodMin  -> good       (3 questions: 5 or 6 of 6 points)
   *   fraction >= watchMin -> watch      (3 or 4 of 6)
   *   otherwise            -> attention  (0, 1 or 2 of 6)
   */
  domain: { goodMin: 0.8, watchMin: 0.5 },

  /**
   * The 5-question quick screen. It is "on track" only when its share of points is >= goodMin AND no single question
   * was answered "no" (a lone "no" is enough reason to look closer).
   */
  quick: { goodMin: 0.8, anyNoMeansLookCloser: true },

  /**
   * Overall band = band of the mean domain share, but never better than "watch" while any domain needs attention.
   */
  overall: { goodMin: 0.8, watchMin: 0.5, capAtWatchIfAnyAttention: true },

  /** Daily plan: weakest domains first. When nothing is weak, the `whenAllGood` lowest domains keep the habit going. */
  plan: { minutes: 15, maxFocus: 3, whenAllGood: 2 },

  /** Retest days after the start of a plan, and how many days early a repeat check still counts for a due date. */
  retestDays: [7, 14, 30] as const,
  retestEarlyGraceDays: 2,

  /** Storage caps (per profile and kind). */
  keepResults: 30,
  keepTickDays: 120,
} as const

/** Bands from best to worst, with their order for "moved up" comparisons. */
export const BAND_RANK: Record<Band, number> = { attention: 0, watch: 1, good: 2 }

/** Domains of each screening, in display order. */
export const DOMAINS: Record<CheckKind, readonly DomainId[]> = {
  child: ['vocab', 'sounds', 'understanding', 'fluency', 'attention', 'articulation'] satisfies ChildDomain[],
  asd: ['joint', 'name', 'pointing', 'imitation', 'play', 'sensory'] satisfies AsdDomain[],
  adult: ['understanding', 'words', 'clarity', 'fluency', 'reading', 'memory'] satisfies AdultDomain[],
}

/** What the parent may tick under "what worries you" and the domains it brings into the detailed assessment. */
export const CONCERN_DOMAINS: Record<Exclude<ConcernId, 'unsure'>, readonly ChildDomain[]> = {
  little: ['vocab'],
  sounds: ['sounds', 'articulation'],
  understand: ['understanding'],
  fluency: ['fluency'],
  contact: ['attention', 'understanding'],
  mouth: ['articulation'],
}
