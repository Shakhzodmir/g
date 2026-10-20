import { ANIMALS_MORE, BIRDS_INSECTS, SEA, WILD } from './more/animals'
import { BAKERY, FOOD_MORE, FRUITS, KITCHEN, VEGETABLES } from './more/food'
import { CLOTHES_MORE, HOUSE, HYGIENE, TOYS_MORE } from './more/home'
import { BODY_MORE, FEELINGS_MORE, PEOPLE_MORE, POSITION, QUESTIONS, TIME_MORE, VERBS } from './more/language'
import { HOLIDAYS, INSTRUMENTS, SPORTS, STATIONERY } from './more/learning'
import { COLORS, NUMBERS, OPPOSITES, SHAPES } from './more/basics'
import { CHILD_PHRASES } from './more/phrases'
import { CITY, JOBS, NATURE, TOOLS, TRANSPORT, WEATHER } from './more/world'
import type { Phrase, Topic, Word } from './types'

/*
 * Children's vocabulary extensions (round 3, content-child author): new topics, more words, more phrases.
 * The data lives in src/content/more/*.ts; this file only assembles it. Needs a native-speaker / speech-therapist
 * review: see docs/content-review-v0.1.md (section "Round 3 — children's vocabulary additions").
 */

export const MORE_TOPICS: Topic[] = [
  { id: 'colors', uz: 'Ranglar', ru: 'Цвета', symbol: 'artist_palette', fitz: 'describe', audience: 'child' },
  { id: 'numbers', uz: 'Sonlar', ru: 'Числа', symbol: 'input_numbers', fitz: 'misc', audience: 'child' },
  { id: 'shapes', uz: 'Shakllar', ru: 'Фигуры', symbol: 'shape_triangle', fitz: 'describe', audience: 'child' },
  { id: 'opposites', uz: 'Qarama-qarshilar', ru: 'Противоположности', symbol: 'left_right_arrow', fitz: 'describe', audience: 'child' },
  { id: 'fruits', uz: 'Mevalar', ru: 'Фрукты', symbol: 'strawberry', fitz: 'thing' },
  { id: 'vegetables', uz: 'Sabzavotlar', ru: 'Овощи', symbol: 'carrot', fitz: 'thing' },
  { id: 'bakery', uz: 'Non va shirinliklar', ru: 'Выпечка и сладости', symbol: 'croissant', fitz: 'thing' },
  { id: 'kitchen', uz: 'Oshxona buyumlari', ru: 'Кухня', symbol: 'frying_pan', fitz: 'thing' },
  { id: 'house', uz: 'Uy jihozlari', ru: 'Мебель и дом', symbol: 'sofa', fitz: 'thing' },
  { id: 'hygiene', uz: 'Gigiyena', ru: 'Гигиена', symbol: 'soap', fitz: 'thing' },
  { id: 'transport', uz: 'Transport', ru: 'Транспорт', symbol: 'taxi', fitz: 'thing' },
  { id: 'jobs', uz: 'Kasblar', ru: 'Профессии', symbol: 'construction_worker', fitz: 'people' },
  { id: 'nature', uz: 'Tabiat va oʻsimliklar', ru: 'Природа и растения', symbol: 'sunflower', fitz: 'thing' },
  { id: 'birds_insects', uz: 'Qushlar va hasharotlar', ru: 'Птицы и насекомые', symbol: 'butterfly', fitz: 'thing', audience: 'child' },
  { id: 'sea', uz: 'Dengiz hayvonlari', ru: 'Морские животные', symbol: 'whale', fitz: 'thing', audience: 'child' },
  { id: 'wild', uz: 'Yovvoyi hayvonlar', ru: 'Дикие животные', symbol: 'giraffe', fitz: 'thing', audience: 'child' },
  { id: 'weather', uz: 'Ob-havo va fasllar', ru: 'Погода и времена года', symbol: 'sun_behind_large_cloud', fitz: 'thing' },
  { id: 'stationery', uz: 'Qalamdon va sinf', ru: 'Канцелярия и класс', symbol: 'pencil_case', fitz: 'thing', audience: 'child' },
  { id: 'instruments', uz: 'Musiqa asboblari', ru: 'Музыкальные инструменты', symbol: 'guitar', fitz: 'thing' },
  { id: 'sports', uz: 'Sport va oʻyin maydonchasi', ru: 'Спорт и площадка', symbol: 'soccer_ball', fitz: 'thing' },
  { id: 'holidays', uz: 'Bayramlar', ru: 'Праздники', symbol: 'party_popper', fitz: 'thing' },
  { id: 'city', uz: 'Shahar va qishloq', ru: 'Город и село', symbol: 'cityscape', fitz: 'thing' },
  { id: 'tools', uz: 'Asboblar', ru: 'Инструменты', symbol: 'hammer', fitz: 'thing' },
  { id: 'verbs', uz: 'Kundalik harakatlar', ru: 'Повседневные действия', symbol: 'clapping_hands', fitz: 'action' },
  { id: 'position', uz: 'Joylashuv', ru: 'Где находится', symbol: 'pos_in', fitz: 'misc' },
  { id: 'questions', uz: 'Savollar', ru: 'Вопросы', symbol: 'white_question_mark', fitz: 'question' },
]

/** Words of the new topics first (in topic order), then additions to existing topics (food, people, feelings, body, toys, clothes, animals, time). */
export const MORE_WORDS: Word[] = [
  ...COLORS,
  ...NUMBERS,
  ...SHAPES,
  ...OPPOSITES,
  ...FRUITS,
  ...VEGETABLES,
  ...BAKERY,
  ...KITCHEN,
  ...HOUSE,
  ...HYGIENE,
  ...TRANSPORT,
  ...JOBS,
  ...NATURE,
  ...BIRDS_INSECTS,
  ...SEA,
  ...WILD,
  ...WEATHER,
  ...STATIONERY,
  ...INSTRUMENTS,
  ...SPORTS,
  ...HOLIDAYS,
  ...CITY,
  ...TOOLS,
  ...VERBS,
  ...POSITION,
  ...QUESTIONS,
  ...FOOD_MORE,
  ...PEOPLE_MORE,
  ...FEELINGS_MORE,
  ...BODY_MORE,
  ...TOYS_MORE,
  ...CLOTHES_MORE,
  ...ANIMALS_MORE,
  ...TIME_MORE,
]

export const MORE_PHRASES: Phrase[] = CHILD_PHRASES
