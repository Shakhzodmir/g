import type { Bi } from '../i18n/types'

/** "Hissiyotlarim / Мои чувства": one feeling, then "what will help me". Text is first person. */
export interface Feeling extends Bi {
  id: string
  symbol: string
  ruTts: string
  /** HELPERS ids offered for this feeling, most likely first. */
  helps: string[]
}

export type Helper = Bi & { id: string; symbol: string; ruTts: string }

export const HELPERS: Helper[] = [
  { id: 'hug', uz: 'Quchoqlash', ru: 'Обняться', ruTts: 'Обн+яться', symbol: 'people_hugging' },
  { id: 'water', uz: 'Suv ichish', ru: 'Попить воды', ruTts: 'Поп+ить вод+ы', symbol: 'droplet' },
  { id: 'quiet_place', uz: 'Tinch joy', ru: 'Тихое место', ruTts: 'Т+ихое м+есто', symbol: 'person_in_lotus_position' },
  { id: 'headphones', uz: 'Quloqchin', ru: 'Наушники', ruTts: 'Н+аушники', symbol: 'headphone' },
  { id: 'breathe', uz: 'Nafas olish', ru: 'Подышать', ruTts: 'Подыш+ать', symbol: 'face_exhaling' },
  { id: 'rest', uz: 'Dam olish', ru: 'Отдохнуть', ruTts: 'Отдохн+уть', symbol: 'couch_and_lamp' },
  { id: 'with_mom', uz: 'Yaqin odam bilan', ru: 'С близким человеком', ruTts: 'С бл+изким чел+овеком', symbol: 'person' },
  { id: 'toy', uz: 'Oʻyinchoq', ru: 'Игрушка', ruTts: 'Игр+ушка', symbol: 'teddy_bear' },
  { id: 'music', uz: 'Musiqa', ru: 'Музыка', ruTts: 'М+узыка', symbol: 'musical_notes' },
  { id: 'walk', uz: 'Sayr', ru: 'Погулять', ruTts: 'Погул+ять', symbol: 'footprints' },
  { id: 'tell_adult', uz: 'Kattaga aytish', ru: 'Сказать взрослому', ruTts: 'Сказ+ать взр+ослому', symbol: 'person_raising_hand' },
  { id: 'doctor', uz: 'Shifokor', ru: 'Врач', ruTts: 'Врач', symbol: 'health_worker' },
]

export const FEELINGS: Feeling[] = [
  { id: 'happy', uz: 'Xursandman', ru: 'Мне весело', ruTts: 'Мне в+есело', symbol: 'beaming_face_with_smiling_eyes', helps: ['music', 'toy', 'hug', 'walk'] },
  { id: 'calm', uz: 'Tinchman', ru: 'Мне спокойно', ruTts: 'Мне спок+ойно', symbol: 'relieved_face', helps: ['music', 'toy', 'rest'] },
  { id: 'sad', uz: 'Xafaman', ru: 'Мне грустно', ruTts: 'Мне гр+устно', symbol: 'frowning_face', helps: ['hug', 'with_mom', 'toy', 'music'] },
  { id: 'angry', uz: 'Jahlim chiqdi', ru: 'Я злюсь', ruTts: 'Я злюсь', symbol: 'face_with_steam_from_nose', helps: ['breathe', 'quiet_place', 'water', 'walk'] },
  { id: 'scared', uz: 'Qoʻrqyapman', ru: 'Мне страшно', ruTts: 'Мне стр+ашно', symbol: 'fearful_face', helps: ['with_mom', 'hug', 'breathe', 'tell_adult'] },
  { id: 'tired', uz: 'Charchadim', ru: 'Я устаю', ruTts: 'Я уста+ю', symbol: 'sleepy_face', helps: ['rest', 'quiet_place', 'water'] },
  { id: 'hurts', uz: 'Ogʻriyapti', ru: 'Мне больно', ruTts: 'Мне б+ольно', symbol: 'face_with_head_bandage', helps: ['tell_adult', 'with_mom', 'doctor', 'rest'] },
  { id: 'noise', uz: 'Shovqin bezovta qilyapti', ru: 'Мне мешает шум', ruTts: 'Мне меш+ает шум', symbol: 'hear_no_evil_monkey', helps: ['headphones', 'quiet_place', 'breathe', 'rest'] },
]
