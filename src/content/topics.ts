import type { Topic } from './types'

/** Communicator topics in display order. `core` is always first. */
export const TOPICS: Topic[] = [
  { id: 'core', uz: 'Asosiy soʻzlar', ru: 'Главные слова', symbol: 'glowing_star', fitz: 'misc' },
  { id: 'food', uz: 'Ovqat', ru: 'Еда', symbol: 'shallow_pan_of_food', fitz: 'thing' },
  { id: 'drinks', uz: 'Ichimliklar', ru: 'Питьё', symbol: 'cup_with_straw', fitz: 'thing' },
  { id: 'people', uz: 'Oila va odamlar', ru: 'Семья и люди', symbol: 'busts_in_silhouette', fitz: 'people' },
  { id: 'feelings', uz: 'Hissiyotlar', ru: 'Чувства', symbol: 'slightly_smiling_face', fitz: 'describe' },
  { id: 'body', uz: 'Tana', ru: 'Тело', symbol: 'flexed_biceps', fitz: 'thing' },
  { id: 'toys', uz: 'Oʻyinchoqlar', ru: 'Игрушки', symbol: 'teddy_bear', fitz: 'thing' },
  { id: 'places', uz: 'Joylar', ru: 'Места', symbol: 'house_with_garden', fitz: 'thing' },
  { id: 'clothes', uz: 'Kiyim', ru: 'Одежда', symbol: 't_shirt', fitz: 'thing' },
  { id: 'actions', uz: 'Harakatlar', ru: 'Действия', symbol: 'person_running', fitz: 'action' },
  { id: 'animals', uz: 'Hayvonlar', ru: 'Животные', symbol: 'dog_face', fitz: 'thing' },
  { id: 'school', uz: 'Bogʻcha va maktab', ru: 'Садик и школа', symbol: 'backpack', fitz: 'thing' },
  { id: 'time', uz: 'Vaqt va ob-havo', ru: 'Время и погода', symbol: 'mantelpiece_clock', fitz: 'misc' },
]
