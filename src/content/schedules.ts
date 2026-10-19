import type { Bi } from '../i18n/types'

/* Visual schedule templates ("Kun tartibi / Мой день"). Items are WORDS ids, in order. */
export const SCHEDULE_TEMPLATES: Array<{ id: string; title: Bi; items: string[] }> = [
  {
    id: 'morning',
    title: { uz: 'Ertalab', ru: 'Утро' },
    items: ['wake_up', 'toilet', 'wash_face', 'brush_teeth', 'get_dressed', 'breakfast', 'go_kindergarten'],
  },
  {
    id: 'kindergarten',
    title: { uz: 'Bogʻcha', ru: 'Садик' },
    items: ['breakfast', 'lesson', 'play_time', 'walk', 'lunch', 'nap', 'go_home'],
  },
  {
    id: 'evening',
    title: { uz: 'Kechqurun', ru: 'Вечер' },
    items: ['dinner', 'play_time', 'bath', 'brush_teeth', 'story_time', 'bedtime'],
  },
]
