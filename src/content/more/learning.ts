import type { Word } from '../types'
import { mk } from './kit'

/* Stationery, musical instruments, sports & playground, holidays. */

const st = mk('stationery', 'thing', 'child')
export const STATIONERY: Word[] = [
  st('ruler', 'chizgʻich', 'линейка', 'лин+ейка', 'straight_ruler', true),
  st('eraser', 'oʻchirgʻich', 'ластик', 'л+астик', 'eraser', true),
  st('pencil_case', 'qalamdon', 'пенал', 'пен+ал', 'pencil_case', true),
  st('glue', 'yelim', 'клей', 'клей', 'glue', true),
  st('sharpener', 'qalamtarosh', 'точилка', 'точ+илка', 'sharpener', true),
  st('paintbrush', 'choʻtka', 'кисточка', 'к+источка', 'paintbrush', true),
  st('chalk', 'boʻr', 'мел', 'мел', 'chalk'),
  st('blackboard', 'doska', 'доска', 'доск+а', 'blackboard', true),
  st('globe', 'globus', 'глобус', 'гл+обус', 'globe_showing_asia_australia', true),
  st('paper', 'qogʻoz', 'бумага', 'бум+ага', 'page_facing_up', true),
  st('paperclip', 'qisqich', 'скрепка', 'скр+епка', 'paperclip', true),
  st('pushpin', 'knopka', 'кнопка', 'кн+опка', 'pushpin', true),
  st('desk', 'parta', 'парта', 'п+арта', 'desk', true),
  st('diary', 'kundalik', 'дневник', 'дневн+ик', 'notebook_with_decorative_cover', true),
  st('microscope', 'mikroskop', 'микроскоп', 'микроск+оп', 'microscope', true),
  st('telescope', 'teleskop', 'телескоп', 'телеск+оп', 'telescope', true),
  st('envelope', 'konvert', 'конверт', 'конв+ерт', 'envelope', true),
]

const mu = mk('instruments', 'thing')
export const INSTRUMENTS: Word[] = [
  mu('guitar', 'gitara', 'гитара', 'гит+ара', 'guitar', true),
  mu('violin', 'skripka', 'скрипка', 'скр+ипка', 'violin', true),
  mu('piano', 'pianino', 'пианино', 'пиан+ино', 'musical_keyboard', true),
  mu('trumpet', 'truba', 'труба', 'труб+а', 'trumpet', true),
  mu('saxophone', 'saksofon', 'саксофон', 'саксоф+он', 'saxophone', true),
  mu('flute', 'nay', 'флейта', 'фл+ейта', 'flute', true),
  mu('accordion', 'akkordeon', 'аккордеон', 'аккорде+он', 'accordion', true),
  mu('maracas', 'maraka', 'маракасы', 'мар+акасы', 'maracas', true),
  mu('small_bell', 'qoʻngʻiroqcha', 'колокольчик', 'колокольч+ик', 'bell', true),
  mu('note', 'nota', 'нота', 'н+ота', 'musical_note', true),
  mu('doira', 'doira', 'бубен', 'б+убен', 'doira', true),
  mu('dutor', 'dutor', 'дутар', 'дут+ар', 'dutor', true),
  mu('microphone', 'mikrofon', 'микрофон', 'микроф+он', 'studio_microphone', true),
  mu('headphones', 'naushnik', 'наушники', 'н+аушники', 'headphone', true),
]

const sp = mk('sports', 'thing')
export const SPORTS: Word[] = [
  sp('football', 'futbol', 'футбол', 'футб+ол', 'soccer_ball', true),
  sp('basketball', 'basketbol', 'баскетбол', 'баскетб+ол', 'basketball', true),
  sp('volleyball', 'voleybol', 'волейбол', 'волейб+ол', 'volleyball', true),
  sp('tennis', 'tennis', 'теннис', 'т+еннис', 'tennis', true),
  sp('table_tennis', 'stol tennisi', 'настольный теннис', 'наст+ольный т+еннис', 'ping_pong'),
  sp('swing', 'belanchak', 'качели', 'кач+ели', 'swing', true, 'child'),
  sp('roller_skates', 'rolik', 'ролики', 'р+олики', 'roller_skate', true),
  sp('skateboard', 'skeytbord', 'скейтборд', 'скейтб+орд', 'skateboard', true),
  sp('ice_skates', 'konki', 'коньки', 'коньк+и', 'ice_skate', true),
  sp('skis', 'changʻi', 'лыжи', 'л+ыжи', 'skis', true),
  sp('sled', 'chana', 'санки', 'с+анки', 'sled', true),
  sp('medal', 'medal', 'медаль', 'мед+аль', 'sports_medal', true),
  sp('trophy', 'kubok', 'кубок', 'к+убок', 'trophy', true),
  sp('goal', 'darvoza', 'ворота', 'вор+ота', 'goal_net', true),
  sp('boxing', 'boks', 'бокс', 'бокс', 'boxing_glove'),
  sp('wrestling', 'kurash', 'борьба', 'борьб+а', 'person_wrestling', true),
  sp('chess', 'shaxmat', 'шахматы', 'ш+ахматы', 'chess_pawn', true),
  sp('target', 'nishon', 'мишень', 'миш+ень', 'bullseye', true),
]

const ho = mk('holidays', 'thing')
export const HOLIDAYS: Word[] = [
  ho('holiday', 'bayram', 'праздник', 'пр+аздник', 'party_popper', true),
  ho('birthday', 'tugʻilgan kun', 'день рождения', 'день рожд+ения', 'birthday_cake'),
  ho('gift', 'sovgʻa', 'подарок', 'под+арок', 'wrapped_gift', true),
  ho('candle', 'sham', 'свеча', 'свеч+а', 'candle'),
  ho('fireworks', 'otashbozlik', 'салют', 'сал+ют', 'fireworks', true),
  ho('navroz', 'Navroʻz', 'Навруз', 'Навр+уз', 'navroz', true),
  ho('new_year', 'Yangi yil', 'Новый год', 'Н+овый год', 'sparkler'),
  ho('fir_tree', 'yolka', 'ёлка', '+ёлка', 'christmas_tree', true),
  ho('hayit', 'Hayit', 'Хайит', 'Хай+ит', 'sparkles', true),
  ho('congratulation', 'tabrik', 'поздравление', 'поздравл+ение', 'partying_face', true),
  ho('wedding', 'toʻy', 'свадьба', 'св+адьба', 'ring', true),
  ho('applause', 'qarsak', 'аплодисменты', 'аплодисм+енты', 'clapping_hands', true),
  ho('confetti', 'konfetti', 'конфетти', 'конфетт+и', 'confetti_ball', true),
  ho('photo', 'surat', 'фото', 'ф+ото', 'camera', true),
  ho('greeting_card', 'otkritka', 'открытка', 'откр+ытка', 'love_letter', true),
  ho('wish', 'tilak', 'желание', 'жел+ание', 'shooting_star', true),
]
