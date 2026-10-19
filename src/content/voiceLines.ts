import type { Bi } from '../i18n/types'

/** A fixed spoken line (audio key `ui.<id>`). Templates ("Hozir: …") are assembled in code from these parts. */
export interface VoiceLine extends Bi {
  id: string
  ruTts: string
}

function v(id: string, uz: string, ru: string, ruTts: string): VoiceLine {
  return { id, uz, ru, ruTts }
}

/*
 * Tone: calm, warm, literal. Praise is quiet (no "Super-puper!"), retries never say "wrong".
 * The mascot speaks to the child with the informal "sen".
 */
export const VOICE_LINES: VoiceLine[] = [
  // Mascot
  v('mascot_hello', 'Salom! Men Musicha.', 'Привет! Я Муся.', 'Прив+ет! Я М+уся.'),
  v('mascot_lets_go', 'Qani, boshladik.', 'Давай начнём.', 'Дав+ай начн+ём.'),

  // Calm praise
  v('praise_barakalla', 'Barakalla!', 'Так держать!', 'Так держ+ать!'),
  v('praise_yaxshi', 'Yaxshi.', 'Хорошо.', 'Хорош+о.'),
  v('praise_zor', 'Zoʻr!', 'Здорово!', 'Зд+орово!'),
  v('praise_ajoyib', 'Ajoyib.', 'Отлично.', 'Отл+ично.'),
  v('praise_ofarin', 'Ofarin!', 'Замечательно.', 'Замеч+ательно.'),
  v('praise_uddalading', 'Uddalading.', 'У тебя получилось.', 'У теб+я получ+илось.'),
  v('praise_mana_shunday', 'Mana shunday.', 'Вот так.', 'Вот так.'),
  v('praise_chiroyli', 'Chiroyli.', 'Красиво.', 'Крас+иво.'),
  v('praise_harakat', 'Yaxshi harakat qilding.', 'Хорошая попытка.', 'Хорош+ая поп+ытка.'),

  // Gentle retry (never "wrong")
  v('retry_again', 'Yana bir marta urinib koʻramiz.', 'Попробуем ещё раз.', 'Попр+обуем ещ+ё раз.'),
  v('retry_together', 'Kel, birga qilamiz.', 'Давай сделаем вместе.', 'Дав+ай сд+елаем вм+есте.'),
  v('retry_look_here', 'Mana bu yerga qara.', 'Посмотри сюда.', 'Посмотр+и сюд+а.'),
  v('retry_no_hurry', 'Shoshilmaymiz.', 'Не спешим.', 'Не спеш+им.'),
  v('retry_this_one', 'Mana bu.', 'Вот это.', 'Вот +это.'),

  // Round end
  v('round_done', 'Tamom! Dam olamiz.', 'Всё! Отдыхаем.', 'Вс+ё! Отдых+аем.'),
  v('rest', 'Dam olamiz.', 'Отдыхаем.', 'Отдых+аем.'),
  v('enough_today', 'Bugunga yetarli.', 'На сегодня всё.', 'На сег+одня вс+ё.'),
  v('sticker_got', 'Senga yangi stiker.', 'Тебе новая наклейка.', 'Теб+е н+овая накл+ейка.'),

  // Timer
  v('timer_start', 'Boshladik.', 'Начинаем.', 'Начин+аем.'),
  v('timer_one_minute', 'Yana bir daqiqa.', 'Ещё одна минута.', 'Ещ+ё одн+а мин+ута.'),
  v('timer_two_minutes', 'Yana ikki daqiqa.', 'Ещё две минуты.', 'Ещ+ё две мин+уты.'),
  v('timer_five_minutes', 'Yana besh daqiqa.', 'Ещё пять минут.', 'Ещ+ё пять мин+ут.'),
  v('timer_done', 'Vaqt tugadi.', 'Время закончилось.', 'Вр+емя зак+ончилось.'),

  // Calm corner: breathing
  v('breathe_in', 'Nafas ol.', 'Вдох.', 'Вдох.'),
  v('breathe_out', 'Nafas chiqar.', 'Выдох.', 'В+ыдох.'),
  v('breathe_in_out', 'Nafas ol… Nafas chiqar.', 'Вдох… Выдох.', 'Вдох… В+ыдох.'),
  v('breathe_slow', 'Sekin nafas olamiz.', 'Дышим медленно.', 'Д+ышим м+едленно.'),
  v('calm_safe', 'Sen xavfsizsan.', 'Ты в безопасности.', 'Ты в безоп+асности.'),
  v('calm_near', 'Men yoningdaman.', 'Я рядом.', 'Я р+ядом.'),

  // Break
  v('break_start', 'Tanaffus. Dam olamiz.', 'Перерыв. Отдыхаем.', 'Перер+ыв. Отдых+аем.'),
  v('break_when_ready', 'Tayyor boʻlsang, tugmani bos.', 'Когда захочешь, нажми кнопку.', 'Когд+а захоч+ешь, нажм+и кн+опку.'),
  v('break_back', 'Qaytamiz.', 'Возвращаемся.', 'Возвращ+аемся.'),

  // Schedule (parts; "Hozir: <word>" is built in code)
  v('sched_first', 'Avval', 'Сначала', 'Снач+ала'),
  v('sched_then', 'keyin', 'потом', 'пот+ом'),
  v('sched_now', 'Hozir', 'Сейчас', 'Сейч+ас'),
  v('sched_next', 'Keyingisi', 'Дальше', 'Д+альше'),
  v('sched_item_done', 'Bajarildi.', 'Сделано.', 'Сд+елано.'),
  v('sched_all_done', 'Hammasi tayyor!', 'Всё готово!', 'Вс+ё гот+ово!'),
  v('sched_today', 'Bugun', 'Сегодня', 'Сег+одня'),

  // Token board (parts: "Yana" + number + "ta yulduzcha"; ru picks the plural form in code)
  v('tok_more', 'Yana', 'Ещё', 'Ещ+ё'),
  v('tok_star_count', 'ta yulduzcha', 'звёздочка', 'зв+ёздочка'),
  v('tok_star_few', 'ta yulduzcha', 'звёздочки', 'зв+ёздочки'),
  v('tok_star_many', 'ta yulduzcha', 'звёздочек', 'зв+ёздочек'),
  v('tok_one_more', 'Yana bitta!', 'Ещё одна!', 'Ещ+ё одн+а!'),
  v('tok_full', 'Hamma yulduzchalar yigʻildi!', 'Все звёздочки собраны!', 'Все зв+ёздочки с+обраны!'),
  v('tok_reward', 'Endi mukofot.', 'Теперь награда.', 'Теп+ерь нагр+ада.'),

  // Feelings
  v('feel_ask', 'Oʻzingni qanday his qilyapsan?', 'Как ты себя чувствуешь?', 'Как ты себ+я ч+увствуешь?'),
  v('feel_help', 'Senga nima yordam beradi?', 'Что тебе поможет?', 'Что теб+е пом+ожет?'),
  v('feel_thanks', 'Rahmat! Men seni tushunaman.', 'Спасибо! Я тебя понимаю.', 'Спас+ибо! Я теб+я поним+аю.'),

  // Social stories
  v('story_end', 'Hikoya tugadi.', 'Конец истории.', 'Кон+ец ист+ории.'),
]

/* Number words 1–10 for timer/token templates. Russian uses feminine forms (минута, звёздочка). */
export const NUMBER_LINES: VoiceLine[] = [
  v('num_1', 'bir', 'одна', 'одн+а'),
  v('num_2', 'ikki', 'две', 'две'),
  v('num_3', 'uch', 'три', 'три'),
  v('num_4', 'toʻrt', 'четыре', 'чет+ыре'),
  v('num_5', 'besh', 'пять', 'пять'),
  v('num_6', 'olti', 'шесть', 'шесть'),
  v('num_7', 'yetti', 'семь', 'семь'),
  v('num_8', 'sakkiz', 'восемь', 'в+осемь'),
  v('num_9', 'toʻqqiz', 'девять', 'д+евять'),
  v('num_10', 'oʻn', 'десять', 'д+есять'),
]
