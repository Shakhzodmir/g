import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Bi } from '../i18n/types'
import { ADULT_TITLES } from './adultTitles'

export type FeatureId = 'aac' | 'schedule' | 'timer' | 'tokens' | 'calm' | 'feelings' | 'stories' | 'games' | 'exercises' | 'parent'

export interface FeatureDef {
  id: FeatureId
  /** Route path (nested routes allowed below it). */
  path: string
  title: Bi
  /** Title in adult mode (navigation, headings, document title); falls back to `title`. */
  adultTitle?: Bi
  /** Who the screen is for; absent = both. A screen for the other kind is hidden from every entry and redirects Home. */
  audience?: 'child' | 'adult' | 'both'
  symbol: string
  Component: LazyExoticComponent<ComponentType>
}

/** Every screen is a lazily loaded feature so each one can be built and shipped independently. */
export const FEATURES: Record<FeatureId, FeatureDef> = {
  aac: { id: 'aac', path: '/talk', title: { uz: 'Gapirish', ru: 'Говорить' }, symbol: 'speaking_head', Component: lazy(() => import('../features/aac')) },
  schedule: { id: 'schedule', path: '/day', title: { uz: 'Kun tartibi', ru: 'Мой день' }, adultTitle: ADULT_TITLES.schedule, symbol: 'calendar', Component: lazy(() => import('../features/schedule')) },
  timer: { id: 'timer', path: '/timer', title: { uz: 'Vaqt', ru: 'Таймер' }, adultTitle: ADULT_TITLES.timer, symbol: 'hourglass', Component: lazy(() => import('../features/timer')) },
  tokens: { id: 'tokens', path: '/tokens', title: { uz: 'Yulduzchalar', ru: 'Звёздочки' }, audience: 'child', symbol: 'star', Component: lazy(() => import('../features/tokens')) },
  calm: { id: 'calm', path: '/calm', title: { uz: 'Tinch burchak', ru: 'Уголок спокойствия' }, adultTitle: ADULT_TITLES.calm, symbol: 'calm', Component: lazy(() => import('../features/calm')) },
  feelings: { id: 'feelings', path: '/feelings', title: { uz: 'Hissiyotlarim', ru: 'Мои чувства' }, adultTitle: ADULT_TITLES.feelings, symbol: 'feelings', Component: lazy(() => import('../features/feelings')) },
  stories: { id: 'stories', path: '/stories', title: { uz: 'Hikoyalar', ru: 'Истории' }, audience: 'child', symbol: 'book', Component: lazy(() => import('../features/stories')) },
  games: { id: 'games', path: '/games', title: { uz: 'Oʻyinlar', ru: 'Игры' }, adultTitle: ADULT_TITLES.games, symbol: 'puzzle', Component: lazy(() => import('../features/games')) },
  exercises: { id: 'exercises', path: '/exercises', title: { uz: 'Mashqlar', ru: 'Разминка' }, adultTitle: ADULT_TITLES.exercises, symbol: 'lips', Component: lazy(() => import('../features/exercises')) },
  parent: { id: 'parent', path: '/parent', title: { uz: 'Ota-onalar', ru: 'Родителям' }, symbol: 'family', Component: lazy(() => import('../features/parent')) },
}

/** The title a profile of this kind sees. */
export function featureTitle(f: FeatureDef, kind: 'child' | 'adult'): Bi {
  return kind === 'adult' && f.adultTitle ? f.adultTitle : f.title
}

/** Whether a profile of this kind may open the screen. */
export function featureAllowed(f: FeatureDef, kind: 'child' | 'adult'): boolean {
  return !f.audience || f.audience === 'both' || f.audience === kind
}
