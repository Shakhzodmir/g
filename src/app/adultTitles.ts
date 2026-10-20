import { useI18n } from '../i18n'
import type { Bi } from '../i18n/types'
import { useProfileStore } from '../store/profile'

/** Names of the screens in adult mode (navigation, headings, document title). Children keep the playful names. */
export const ADULT_TITLES = {
  schedule: { uz: 'Reja', ru: 'План' },
  timer: { uz: 'Taymer', ru: 'Таймер' },
  calm: { uz: 'Tinchlanish', ru: 'Расслабление' },
  feelings: { uz: 'Hissiyotlar', ru: 'Чувства' },
  games: { uz: 'Mashq', ru: 'Тренировка' },
  exercises: { uz: 'Ovoz', ru: 'Голос' },
  /** Heading of the voice-exercises hub (the navigation says «Ovoz / Голос»). */
  exercisesHeading: { uz: 'Ovoz mashqlari', ru: 'Упражнения для голоса' },
} as const satisfies Record<string, Bi>

/** Heading of a screen: the adult name for adults, otherwise `fallback` (the screen's own, child-facing title). */
export function useScreenTitle(id: keyof typeof ADULT_TITLES, fallback: string): string {
  const { ui } = useI18n()
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  return adult ? ui(ADULT_TITLES[id]) : fallback
}
