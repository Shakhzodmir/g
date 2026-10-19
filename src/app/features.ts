import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Bi } from '../i18n/types'

export type FeatureId = 'aac' | 'schedule' | 'timer' | 'tokens' | 'calm' | 'feelings' | 'stories' | 'games' | 'exercises' | 'parent'

export interface FeatureDef {
  id: FeatureId
  /** Route path (nested routes allowed below it). */
  path: string
  title: Bi
  symbol: string
  Component: LazyExoticComponent<ComponentType>
}

/** Every screen is a lazily loaded feature so each one can be built and shipped independently. */
export const FEATURES: Record<FeatureId, FeatureDef> = {
  aac: { id: 'aac', path: '/talk', title: { uz: 'Gapirish', ru: 'Говорить' }, symbol: 'speaking_head', Component: lazy(() => import('../features/aac')) },
  schedule: { id: 'schedule', path: '/day', title: { uz: 'Kun tartibi', ru: 'Мой день' }, symbol: 'calendar', Component: lazy(() => import('../features/schedule')) },
  timer: { id: 'timer', path: '/timer', title: { uz: 'Vaqt', ru: 'Таймер' }, symbol: 'hourglass', Component: lazy(() => import('../features/timer')) },
  tokens: { id: 'tokens', path: '/tokens', title: { uz: 'Yulduzchalar', ru: 'Звёздочки' }, symbol: 'star', Component: lazy(() => import('../features/tokens')) },
  calm: { id: 'calm', path: '/calm', title: { uz: 'Tinch burchak', ru: 'Уголок спокойствия' }, symbol: 'calm', Component: lazy(() => import('../features/calm')) },
  feelings: { id: 'feelings', path: '/feelings', title: { uz: 'Hissiyotlarim', ru: 'Мои чувства' }, symbol: 'feelings', Component: lazy(() => import('../features/feelings')) },
  stories: { id: 'stories', path: '/stories', title: { uz: 'Hikoyalar', ru: 'Истории' }, symbol: 'book', Component: lazy(() => import('../features/stories')) },
  games: { id: 'games', path: '/games', title: { uz: 'Oʻyinlar', ru: 'Игры' }, symbol: 'puzzle', Component: lazy(() => import('../features/games')) },
  exercises: { id: 'exercises', path: '/exercises', title: { uz: 'Mashqlar', ru: 'Упражнения' }, symbol: 'lips', Component: lazy(() => import('../features/exercises')) },
  parent: { id: 'parent', path: '/parent', title: { uz: 'Ota-onalar', ru: 'Родителям' }, symbol: 'family', Component: lazy(() => import('../features/parent')) },
}
