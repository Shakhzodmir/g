import { ADULT_CARE_WORDS } from './adultWordsCare'
import { ADULT_LIFE_WORDS } from './adultWordsLife'
import { ADULT_WORLD_WORDS } from './adultWordsWorld'
import type { Topic, Word } from './types'

/*
 * Adult vocabulary (topics and words that only make sense for adult users: aphasia, dysarthria, ALS, stroke,
 * Parkinson, acquired speech loss, autistic adults). Tone: practical, dignified, specific, never childish.
 * Uzbek is the form an adult would actually say; Russian is plain and gender-neutral (nouns, infinitives, imperatives
 * with «вы»). Medical wording is a draft and must be confirmed by a physician / speech-language pathologist
 * (docs/content-review-v0.1.md, section «Взрослый словарь»).
 */

/** Adult topics in display order (the communicator puts adult topics before the shared ones). */
export const ADULT_TOPICS: Topic[] = [
  { id: 'talk', uz: 'Suhbat', ru: 'Разговор', symbol: 'left_speech_bubble', fitz: 'social', audience: 'adult' },
  { id: 'health', uz: 'Salomatlik', ru: 'Здоровье', symbol: 'stethoscope', fitz: 'describe', audience: 'adult' },
  { id: 'bodyparts', uz: 'Ogʻriq joyi', ru: 'Где болит', symbol: 'body_back', fitz: 'thing', audience: 'adult' },
  { id: 'conditions', uz: 'Tashxis va funksiyalar', ru: 'Диагнозы и функции', symbol: 'brain', fitz: 'thing', audience: 'adult' },
  { id: 'medicine', uz: 'Dori-darmon', ru: 'Лекарства', symbol: 'pill', fitz: 'thing', audience: 'adult' },
  { id: 'hospital', uz: 'Shifoxona', ru: 'Больница', symbol: 'health_worker', fitz: 'thing', audience: 'adult' },
  { id: 'needs', uz: 'Kundalik ehtiyojlar', ru: 'Повседневные нужды', symbol: 'shower', fitz: 'action', audience: 'adult' },
  { id: 'home', uz: 'Uy-roʻzgʻor', ru: 'Дом', symbol: 'couch_and_lamp', fitz: 'thing', audience: 'adult' },
  { id: 'meals', uz: 'Oshxona va ovqat', ru: 'Кухня и еда', symbol: 'pot_of_food', fitz: 'thing', audience: 'adult' },
  { id: 'dishes', uz: 'Idish-tovoq', ru: 'Посуда', symbol: 'fork_and_knife_with_plate', fitz: 'thing', audience: 'adult' },
  { id: 'shopping', uz: 'Xarid va pul', ru: 'Покупки и деньги', symbol: 'shopping_cart', fitz: 'thing', audience: 'adult' },
  { id: 'bank', uz: 'Bank va hujjatlar', ru: 'Банк и документы', symbol: 'credit_card', fitz: 'thing', audience: 'adult' },
  { id: 'amounts', uz: 'Raqam va miqdor', ru: 'Числа и количество', symbol: 'input_numbers', fitz: 'misc', audience: 'adult' },
  { id: 'calendar', uz: 'Sana va vaqt', ru: 'Дни и время', symbol: 'tear_off_calendar', fitz: 'misc', audience: 'adult' },
  { id: 'transit', uz: 'Yoʻl va qatnov', ru: 'Дорога и проезд', symbol: 'taxi', fitz: 'thing', audience: 'adult' },
  { id: 'town', uz: 'Muassasalar va joylar', ru: 'Учреждения и места', symbol: 'cityscape', fitz: 'thing', audience: 'adult' },
  { id: 'work', uz: 'Ish va taʼlim', ru: 'Работа и учёба', symbol: 'briefcase', fitz: 'thing', audience: 'adult' },
  { id: 'phone', uz: 'Telefon va internet', ru: 'Телефон и интернет', symbol: 'mobile_phone', fitz: 'thing', audience: 'adult' },
  { id: 'relations', uz: 'Munosabatlar', ru: 'Отношения', symbol: 'people_hugging', fitz: 'people', audience: 'adult' },
  { id: 'emotions', uz: 'Tuygʻular', ru: 'Чувства взрослого', symbol: 'heart_hands', fitz: 'describe', audience: 'adult' },
  { id: 'polite', uz: 'Iltimos va ruxsat', ru: 'Просьбы и вежливость', symbol: 'handshake', fitz: 'social', audience: 'adult' },
  { id: 'tradition', uz: 'Odob va urf-odatlar', ru: 'Традиции', symbol: 'teapot', fitz: 'social', audience: 'adult' },
]

export const ADULT_WORDS: Word[] = [...ADULT_CARE_WORDS, ...ADULT_LIFE_WORDS, ...ADULT_WORLD_WORDS]
