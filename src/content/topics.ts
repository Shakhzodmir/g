import { ADULT_TOPICS } from './adult'
import { MORE_TOPICS } from './more'
import type { Topic } from './types'

/** Communicator topics in display order. `core` is always first. */
const BASE_TOPICS: Topic[] = [
  { id: 'core', uz: 'Asosiy soʻzlar', ru: 'Главные слова', symbol: 'glowing_star', fitz: 'misc' },
  { id: 'food', uz: 'Ovqat', ru: 'Еда', symbol: 'shallow_pan_of_food', fitz: 'thing' },
  { id: 'drinks', uz: 'Ichimliklar', ru: 'Питьё', symbol: 'cup_with_straw', fitz: 'thing' },
  { id: 'people', uz: 'Oila va odamlar', ru: 'Семья и люди', symbol: 'people_hugging', fitz: 'people' },
  { id: 'feelings', uz: 'Hissiyotlar', ru: 'Чувства', symbol: 'slightly_smiling_face', fitz: 'describe' },
  { id: 'body', uz: 'Tana', ru: 'Тело', symbol: 'flexed_biceps', fitz: 'thing' },
  { id: 'toys', uz: 'Oʻyinchoqlar', ru: 'Игрушки', symbol: 'teddy_bear', fitz: 'thing', audience: 'child' },
  { id: 'places', uz: 'Joylar', ru: 'Места', symbol: 'house_with_garden', fitz: 'thing' },
  { id: 'clothes', uz: 'Kiyim', ru: 'Одежда', symbol: 't_shirt', fitz: 'thing' },
  { id: 'actions', uz: 'Harakatlar', ru: 'Действия', symbol: 'person_running', fitz: 'action' },
  { id: 'animals', uz: 'Hayvonlar', ru: 'Животные', symbol: 'dog_face', fitz: 'thing' },
  { id: 'school', uz: 'Bogʻcha va maktab', ru: 'Садик и школа', symbol: 'backpack', fitz: 'thing', audience: 'child' },
  { id: 'time', uz: 'Vaqt va ob-havo', ru: 'Время и погода', symbol: 'mantelpiece_clock', fitz: 'misc' },
]

export const TOPICS: Topic[] = [...BASE_TOPICS, ...MORE_TOPICS, ...ADULT_TOPICS]

/** Topics shown on the communicator tabs (and in games) for a profile kind; adult-only topics first for adults. */
export function topicsForKind(kind: 'child' | 'adult'): Topic[] {
  const ok = TOPICS.filter((t) => !t.audience || t.audience === 'both' || t.audience === kind)
  if (kind !== 'adult') return ok
  const core = ok.filter((t) => t.id === 'core')
  const adult = ok.filter((t) => t.audience === 'adult')
  const rest = ok.filter((t) => t.id !== 'core' && t.audience !== 'adult')
  return [...core, ...adult, ...rest]
}
