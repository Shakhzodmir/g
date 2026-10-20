import type { Bi } from '../i18n/types'

/*
 * Data of the children's games added in round 3 (colours, counting, shapes, odd-one-out, routines,
 * first sounds, build-a-word, opposites, listen-and-point).
 * Words come from src/content (ids only); this file holds what is specific to the games:
 * spoken prompts (audio keys `g.<game>.*`), sentence banks, category lists and routines.
 * uz is canonical Latin (U+02BB in oʻ/gʻ, U+02BC tutuq); ruTts has "+" before the stressed vowel.
 */

/** A fixed spoken line of a game. The audio manifest builds a clip for each (both languages). */
export interface GameLine extends Bi {
  key: string
  ruTts?: string
}

const L = (key: string, uz: string, ru: string, ruTts?: string): GameLine => ({ key, uz, ru, ruTts })

export const GAME_LINES: GameLine[] = [
  L('g.count.ask', 'Nechta?', 'Сколько?', 'Ск+олько?'),
  L('g.count.tap', 'Sanab chiq.', 'Посчитай.', 'Посчит+ай.'),
  L('g.odd.ask', 'Qaysi biri ortiqcha?', 'Какая картинка лишняя?', 'Как+ая карт+инка л+ишняя?'),
  L('g.routine.next', 'Keyin nima boʻladi?', 'Что будет дальше?', 'Что б+удет д+альше?'),
  L('g.routine.order', 'Tartib bilan bos.', 'Нажимай по порядку.', 'Нажим+ай по пор+ядку.'),
  L('g.sound.ask', 'Qaysi rasm xuddi shunday boshlanadi?', 'Какая картинка начинается так же?', 'Как+ая карт+инка начин+ается так же?'),
  L('g.build.ask', 'Soʻzni yigʻ.', 'Собери слово.', 'Собер+и сл+ово.'),
  L('g.opp.ask', 'Qarama-qarshisini top.', 'Найди наоборот.', 'Найд+и наобор+от.'),
  L('g.point.ask', 'Tingla va rasmni koʻrsat.', 'Послушай и покажи картинку.', 'Послуш+ай и покаж+и карт+инку.'),
  L('g.point.again', 'Yana tingla.', 'Послушай ещё раз.', 'Послуш+ай ещ+ё раз.'),
]

/* ---------- Colours ---------- */

export type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' | 'white' | 'black' | 'brown' | 'gray' | 'light_blue'

export interface ColorDef {
  id: ColorId
  /** Word id of the colour name (`color_<id>`), spoken as `w.<id>` and asked as `g.find.<id>`. */
  word: string
  /** Swatch fill: calm, clearly different hues (never neon). */
  hex: string
}

export const COLORS: ColorDef[] = [
  { id: 'red', word: 'color_red', hex: '#D9534F' },
  { id: 'blue', word: 'color_blue', hex: '#3F7FD9' },
  { id: 'green', word: 'color_green', hex: '#4DA862' },
  { id: 'yellow', word: 'color_yellow', hex: '#F2C230' },
  { id: 'orange', word: 'color_orange', hex: '#F28C28' },
  { id: 'purple', word: 'color_purple', hex: '#8E5BC4' },
  { id: 'pink', word: 'color_pink', hex: '#F08DB8' },
  { id: 'white', word: 'color_white', hex: '#FFFFFF' },
  { id: 'black', word: 'color_black', hex: '#2E2E33' },
  { id: 'brown', word: 'color_brown', hex: '#8A5A3B' },
  { id: 'gray', word: 'color_gray', hex: '#9CA3AF' },
  { id: 'light_blue', word: 'color_light_blue', hex: '#7CC8F2' },
]

/** Level 1 uses the six most basic colours. */
export const BASIC_COLORS: ColorId[] = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']

/** Level 3: real things whose colour is obvious (one per colour is shown at a time). */
export const COLOR_OBJECTS: Partial<Record<ColorId, string[]>> = {
  red: ['red_apple', 'kg_strawberry', 'cherries', 'tomato'],
  yellow: ['banana', 'lemon'],
  green: ['cucumber', 'kg_broccoli', 'kg_green_apple', 'kg_pear'],
  orange: ['carrot', 'kg_tangerine'],
  purple: ['grapes', 'kg_eggplant'],
  blue: ['kg_blueberries'],
}

/* ---------- Counting ---------- */

/** Things to count: round, clearly separate pictures. */
export const COUNT_OBJECTS = ['red_apple', 'soccer_ball', 'banana', 'kg_star', 'balloon', 'duck', 'cat', 'teddy_bear', 'butterfly', 'honeybee', 'cherries', 'kg_strawberry']

/* ---------- Shapes ---------- */

export type ShapeId = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'oval' | 'diamond'

export const SHAPES: Array<{ id: ShapeId; word: string }> = [
  { id: 'circle', word: 'shape_circle' },
  { id: 'square', word: 'shape_square' },
  { id: 'triangle', word: 'shape_triangle' },
  { id: 'rectangle', word: 'shape_rectangle' },
  { id: 'star', word: 'shape_star' },
  { id: 'heart', word: 'shape_heart' },
  { id: 'oval', word: 'shape_oval' },
  { id: 'diamond', word: 'shape_diamond' },
]

export const BASIC_SHAPES: ShapeId[] = ['circle', 'square', 'triangle']

/** Level 3: the same shapes in real objects. */
export const SHAPE_OBJECTS: Record<ShapeId, string[]> = {
  circle: ['soccer_ball', 'kg_full_moon'],
  square: ['window'],
  triangle: ['kg_pizza', 'kg_tent'],
  rectangle: ['door', 'blue_book', 'mobile_phone'],
  star: ['kg_star'],
  heart: ['red_heart'],
  oval: ['egg'],
  diamond: ['kite', 'kg_blue_diamond'],
}

/* ---------- Odd one out ---------- */

/** Categories of picture words (ids from src/content/vocab). Missing ids are skipped at run time. */
export const ODD_CATEGORIES: Record<string, string[]> = {
  animals: ['cat', 'dog', 'cow', 'sheep', 'horse', 'rabbit', 'mouse', 'lion', 'elephant', 'monkey', 'frog', 'goat', 'donkey', 'turtle'],
  birds: ['bird', 'chicken', 'duck', 'owl', 'rooster', 'dove'],
  fruit: ['apple', 'banana', 'grapes', 'peach', 'melon', 'watermelon', 'pomegranate'],
  vegetables: ['carrot', 'potato', 'tomato', 'cucumber'],
  drinks: ['water', 'tea', 'milk', 'juice'],
  vehicles: ['car', 'train', 'airplane', 'helicopter', 'bicycle', 'bus', 'ambulance'],
  clothes: ['tshirt', 'dress', 'trousers', 'socks', 'jacket', 'gloves', 'scarf', 'cap', 'shoes'],
  toys: ['ball', 'doll', 'teddy', 'blocks', 'drum', 'kite', 'balloon'],
  body: ['hand', 'eye', 'ear', 'nose', 'mouth', 'leg'],
  school: ['book', 'pencil', 'pen', 'notebook', 'scissors', 'backpack'],
}

/** Easy pairs (very different) for levels 1 and 2. */
export const ODD_FAR: string[] = ['animals', 'fruit', 'vehicles', 'clothes', 'toys', 'drinks', 'body', 'school']

/** Closer pairs for level 3 (never a subset of each other). */
export const ODD_NEAR: Array<[string, string]> = [
  ['fruit', 'vegetables'],
  ['fruit', 'drinks'],
  ['vegetables', 'drinks'],
  ['clothes', 'body'],
  ['school', 'toys'],
  ['animals', 'toys'],
  ['birds', 'vehicles'],
]

/* ---------- Routines ("Nima keyin?") ---------- */

export type DayPart = 'am' | 'day' | 'pm' | 'any'

/** Word ids (time topic) with the part of the day they belong to, so a wrong card is never a plausible next step. */
export const STEP_PART: Record<string, DayPart> = {
  wake_up: 'am',
  wash_face: 'am',
  get_dressed: 'am',
  breakfast: 'am',
  go_kindergarten: 'am',
  brush_teeth: 'any',
  play_time: 'day',
  walk: 'day',
  lunch: 'day',
  nap: 'day',
  dinner: 'pm',
  bath: 'pm',
  story_time: 'pm',
  bedtime: 'pm',
  go_home: 'pm',
}

export const ROUTINES_3: string[][] = [
  ['wake_up', 'wash_face', 'breakfast'],
  ['get_dressed', 'go_kindergarten', 'play_time'],
  ['go_kindergarten', 'play_time', 'lunch'],
  ['lunch', 'nap', 'play_time'],
  ['dinner', 'bath', 'bedtime'],
  ['bath', 'story_time', 'bedtime'],
  ['breakfast', 'brush_teeth', 'go_kindergarten'],
  ['dinner', 'brush_teeth', 'bedtime'],
]

export const ROUTINES_4: string[][] = [
  ['wake_up', 'wash_face', 'get_dressed', 'breakfast'],
  ['dinner', 'bath', 'brush_teeth', 'bedtime'],
  ['bath', 'brush_teeth', 'story_time', 'bedtime'],
  ['lunch', 'nap', 'walk', 'dinner'],
  ['go_kindergarten', 'play_time', 'lunch', 'nap'],
]

/* ---------- Listen and point ---------- */

export interface ListenSentence extends GameLine {
  /** The word whose picture is the answer. */
  target: string
  /** Other picture words named in the sentence: never offered as wrong cards. */
  avoid?: string[]
}

export const LISTEN_SENTENCES: ListenSentence[] = [
  { key: 'g.point.s1', uz: 'Olma stolda yotibdi.', ru: 'Яблоко лежит на столе.', ruTts: '+Яблоко леж+ит на стол+е.', target: 'apple' },
  { key: 'g.point.s2', uz: 'Mushuk divanda uxlayapti.', ru: 'Кошка спит на диване.', ruTts: 'К+ошка спит на див+ане.', target: 'cat' },
  { key: 'g.point.s3', uz: 'It hovlida yuguryapti.', ru: 'Собака бегает во дворе.', ruTts: 'Соб+ака б+егает во двор+е.', target: 'dog', avoid: ['yard'] },
  { key: 'g.point.s4', uz: 'Mashina yoʻlda ketyapti.', ru: 'Машина едет по дороге.', ruTts: 'Маш+ина +едет по дор+оге.', target: 'car' },
  { key: 'g.point.s5', uz: 'Toʻp polda dumalayapti.', ru: 'Мяч катится по полу.', ruTts: 'Мяч кат+ится по пол+у.', target: 'ball' },
  { key: 'g.point.s6', uz: 'Non dasturxonda turibdi.', ru: 'Лепёшка лежит на скатерти.', ruTts: 'Леп+ёшка леж+ит на ск+атерти.', target: 'bread' },
  { key: 'g.point.s7', uz: 'Qush daraxtda oʻtiribdi.', ru: 'Птичка сидит на дереве.', ruTts: 'Пт+ичка сид+ит на д+ереве.', target: 'bird' },
  { key: 'g.point.s8', uz: 'Baliq suvda suzyapti.', ru: 'Рыбка плывёт в воде.', ruTts: 'Р+ыбка плыв+ёт в вод+е.', target: 'fish', avoid: ['water'] },
  { key: 'g.point.s9', uz: 'Sigir oʻt yeyapti.', ru: 'Корова ест траву.', ruTts: 'Кор+ова ест трав+у.', target: 'cow' },
  { key: 'g.point.s10', uz: 'Samolyot osmonda uchyapti.', ru: 'Самолёт летит в небе.', ruTts: 'Самол+ёт лет+ит в н+ебе.', target: 'airplane' },
  { key: 'g.point.s11', uz: 'Sut stakanda turibdi.', ru: 'Молоко стоит в стакане.', ruTts: 'Молок+о ст+оит в стак+ане.', target: 'milk', avoid: ['glass'] },
  { key: 'g.point.s12', uz: 'Quyosh porlayapti.', ru: 'Солнце светит.', ruTts: 'С+олнце свет+ит.', target: 'sun' },
  { key: 'g.point.s13', uz: 'Kitob javonda turibdi.', ru: 'Книга стоит на полке.', ruTts: 'Кн+ига ст+оит на п+олке.', target: 'book' },
  { key: 'g.point.s14', uz: 'Ayiqcha karavotda oʻtiribdi.', ru: 'Мишка сидит на кровати.', ruTts: 'М+ишка сид+ит на кров+ати.', target: 'teddy' },
  { key: 'g.point.s15', uz: 'Tashqarida yomgʻir yogʻyapti.', ru: 'На улице идёт дождь.', ruTts: 'На ул+ице ид+ёт дождь.', target: 'rain' },
  { key: 'g.point.s16', uz: 'Poyezd relsda ketyapti.', ru: 'Поезд едет по рельсам.', ruTts: 'П+оезд +едет по р+ельсам.', target: 'train' },
]

export interface ListenTask extends GameLine {
  /** Two words to show, in this order. */
  targets: [string, string]
}

export const LISTEN_TASKS: ListenTask[] = [
  { key: 'g.point.t1', uz: 'Avval olmani, keyin sutni koʻrsat.', ru: 'Сначала покажи яблоко, потом молоко.', ruTts: 'Снач+ала покаж+и +яблоко, пот+ом молок+о.', targets: ['apple', 'milk'] },
  { key: 'g.point.t2', uz: 'Avval mushukni, keyin itni koʻrsat.', ru: 'Сначала покажи кошку, потом собаку.', ruTts: 'Снач+ала покаж+и к+ошку, пот+ом соб+аку.', targets: ['cat', 'dog'] },
  { key: 'g.point.t3', uz: 'Avval mashinani, keyin toʻpni koʻrsat.', ru: 'Сначала покажи машину, потом мяч.', ruTts: 'Снач+ала покаж+и маш+ину, пот+ом мяч.', targets: ['car', 'ball'] },
  { key: 'g.point.t4', uz: 'Avval nonni, keyin choyni koʻrsat.', ru: 'Сначала покажи лепёшку, потом чай.', ruTts: 'Снач+ала покаж+и леп+ёшку, пот+ом чай.', targets: ['bread', 'tea'] },
  { key: 'g.point.t5', uz: 'Avval bananni, keyin suvni koʻrsat.', ru: 'Сначала покажи банан, потом воду.', ruTts: 'Снач+ала покаж+и бан+ан, пот+ом в+оду.', targets: ['banana', 'water'] },
  { key: 'g.point.t6', uz: 'Avval kitobni, keyin qalamni koʻrsat.', ru: 'Сначала покажи книгу, потом карандаш.', ruTts: 'Снач+ала покаж+и кн+игу, пот+ом каранд+аш.', targets: ['book', 'pencil'] },
  { key: 'g.point.t7', uz: 'Avval qushni, keyin baliqni koʻrsat.', ru: 'Сначала покажи птичку, потом рыбку.', ruTts: 'Снач+ала покаж+и пт+ичку, пот+ом р+ыбку.', targets: ['bird', 'fish'] },
  { key: 'g.point.t8', uz: 'Avval ayiqchani, keyin qoʻgʻirchoqni koʻrsat.', ru: 'Сначала покажи мишку, потом куклу.', ruTts: 'Снач+ала покаж+и м+ишку, пот+ом к+уклу.', targets: ['teddy', 'doll'] },
  { key: 'g.point.t9', uz: 'Avval poyezdni, keyin samolyotni koʻrsat.', ru: 'Сначала покажи поезд, потом самолёт.', ruTts: 'Снач+ала покаж+и п+оезд, пот+ом самол+ёт.', targets: ['train', 'airplane'] },
  { key: 'g.point.t10', uz: 'Avval sigirni, keyin otni koʻrsat.', ru: 'Сначала покажи корову, потом лошадку.', ruTts: 'Снач+ала покаж+и кор+ову, пот+ом лош+адку.', targets: ['cow', 'horse'] },
  { key: 'g.point.t11', uz: 'Avval tuflini, keyin paypoqni koʻrsat.', ru: 'Сначала покажи туфли, потом носки.', ruTts: 'Снач+ала покаж+и т+уфли, пот+ом носк+и.', targets: ['shoes', 'socks'] },
  { key: 'g.point.t12', uz: 'Avval uzumni, keyin sabzini koʻrsat.', ru: 'Сначала покажи виноград, потом морковь.', ruTts: 'Снач+ала покаж+и виногр+ад, пот+ом морк+овь.', targets: ['grapes', 'carrot'] },
]

/* ---------- Opposites ---------- */

/** How one side of a pair is drawn: a Fluent symbol or a small drawn composition. */
export type OppVisual = { symbol: string } | { comp: 'glass_full' | 'glass_empty' | 'shirt_clean' | 'shirt_dirty' }

export interface OppPair {
  id: string
  /** Word ids (`opp_*`). */
  a: string
  b: string
  va: OppVisual
  vb: OppVisual
  /** Simple pairs for level 1. */
  easy?: boolean
}

export const OPP_PAIRS: OppPair[] = [
  { id: 'size', a: 'opp_big', b: 'opp_small', va: { symbol: 'elephant' }, vb: { symbol: 'mouse' }, easy: true },
  { id: 'temp', a: 'opp_hot', b: 'opp_cold', va: { symbol: 'hot_face' }, vb: { symbol: 'cold_face' }, easy: true },
  { id: 'speed', a: 'opp_fast', b: 'opp_slow', va: { symbol: 'rabbit' }, vb: { symbol: 'turtle' }, easy: true },
  { id: 'dir', a: 'opp_up', b: 'opp_down', va: { symbol: 'up_arrow' }, vb: { symbol: 'down_arrow' }, easy: true },
  { id: 'door', a: 'opp_open', b: 'opp_closed', va: { symbol: 'open_book' }, vb: { symbol: 'closed_book' } },
  { id: 'fill', a: 'opp_full', b: 'opp_empty', va: { comp: 'glass_full' }, vb: { comp: 'glass_empty' } },
  { id: 'clean', a: 'opp_clean', b: 'opp_dirty', va: { comp: 'shirt_clean' }, vb: { comp: 'shirt_dirty' } },
  { id: 'weight', a: 'opp_light', b: 'opp_heavy', va: { symbol: 'kg_feather' }, vb: { symbol: 'brick' } },
  { id: 'time', a: 'opp_day', b: 'opp_night', va: { symbol: 'sun' }, vb: { symbol: 'kg_night_with_stars' }, easy: true },
  { id: 'mood', a: 'opp_happy', b: 'opp_sad', va: { symbol: 'beaming_face_with_smiling_eyes' }, vb: { symbol: 'frowning_face' }, easy: true },
]
