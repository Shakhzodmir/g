import type { Word } from '../types'
import { mk } from './kit'

/* House & furniture, hygiene, clothes and toys extensions. */

const h = mk('house', 'thing')
export const HOUSE: Word[] = [
  h('door', 'eshik', 'дверь', 'дверь', 'house_door', true),
  h('window', 'deraza', 'окно', 'окн+о', 'window', true),
  h('stairs', 'zina', 'лестница', 'л+естница', 'stairs', true),
  h('table', 'stol', 'стол', 'стол', 'kid_table'),
  h('sofa', 'divan', 'диван', 'див+ан', 'sofa', true),
  h('bed', 'karavot', 'кровать', 'кров+ать', 'bed', true),
  h('wardrobe', 'shkaf', 'шкаф', 'шкаф', 'wardrobe'),
  h('shelf', 'javon', 'полка', 'п+олка', 'shelf', true),
  h('carpet', 'gilam', 'ковёр', 'ков+ёр', 'carpet', true),
  h('curtain', 'parda', 'штора', 'шт+ора', 'curtain', true),
  h('pillow', 'yostiq', 'подушка', 'под+ушка', 'pillow', true),
  h('blanket', 'koʻrpa', 'одеяло', 'одеял+о', 'blanket', true),
  h('mattress', 'koʻrpacha', 'курпача', 'курп+ача', 'mattress', true),
  h('cradle', 'beshik', 'колыбель', 'колыб+ель', 'cradle', true),
  h('mirror', 'oyna', 'зеркало', 'з+еркало', 'mirror', true),
  h('lamp', 'chiroq', 'лампа', 'л+ампа', 'light_bulb', true),
  h('clock', 'soat', 'часы', 'час+ы', 'mantelpiece_clock'),
  h('tv', 'televizor', 'телевизор', 'телев+изор', 'television', true),
  h('phone', 'telefon', 'телефон', 'телеф+он', 'mobile_phone', true),
  h('radio', 'radio', 'радио', 'р+адио', 'radio', true),
  h('key', 'kalit', 'ключ', 'ключ', 'key', true),
  h('veranda', 'ayvon', 'веранда', 'вер+анда', 'ayvon', true),
  h('living_room', 'mehmonxona', 'гостиная', 'гост+иная', 'couch_and_lamp', true),
  h('trash_bin', 'axlat savati', 'мусорное ведро', 'м+усорное ведр+о', 'wastebasket'),
]

const g = mk('hygiene', 'thing')
export const HYGIENE: Word[] = [
  g('soap', 'sovun', 'мыло', 'м+ыло', 'soap', true),
  g('towel', 'sochiq', 'полотенце', 'полот+енце', 'kid_towel', true),
  g('toothbrush', 'tish choʻtkasi', 'зубная щётка', 'зубн+ая щ+ётка', 'toothbrush'),
  g('toothpaste', 'tish pastasi', 'зубная паста', 'зубн+ая п+аста', 'toothpaste'),
  g('comb', 'taroq', 'расчёска', 'расч+ёска', 'comb', true),
  g('shampoo', 'shampun', 'шампунь', 'шамп+унь', 'lotion_bottle', true),
  g('shower', 'dush', 'душ', 'душ', 'shower'),
  g('toilet_paper', 'tualet qogʻozi', 'туалетная бумага', 'туал+етная бум+ага', 'roll_of_paper'),
  g('tissues', 'salfetka', 'салфетки', 'салф+етки', 'tissues', true),
  g('tap', 'jumrak', 'кран', 'кран', 'tap', true),
  g('sauna', 'hammom', 'баня', 'б+аня', 'person_in_steamy_room', true),
  g('sponge', 'mochalka', 'мочалка', 'моч+алка', 'sponge', true),
  g('germs', 'mikrob', 'микроб', 'микр+об', 'microbe', true),
  g('bucket', 'chelak', 'ведро', 'ведр+о', 'bucket', true),
]

const c = mk('clothes', 'thing')
export const CLOTHES_MORE: Word[] = [
  c('hat', 'shlyapa', 'шляпа', 'шл+япа', 'womans_hat', true),
  c('winter_hat', 'qalpoq', 'шапка', 'ш+апка', 'winter_hat', true),
  c('swimsuit', 'choʻmilish kiyimi', 'купальник', 'купальн+ик', 'one_piece_swimsuit'),
  c('underwear', 'ichki kiyim', 'трусы', 'трус+ы', 'briefs'),
  c('tie', 'galstuk', 'галстук', 'г+алстук', 'necktie', true),
  c('bag', 'sumka', 'сумка', 'с+умка', 'handbag', true),
  c('sandals', 'sandal', 'сандалии', 'санд+алии', 'womans_sandal', true),
  c('hiking_boots', 'botinka', 'ботинки', 'бот+инки', 'hiking_boot', true),
  c('sweater', 'kofta', 'кофта', 'к+офта', 'sweater', true),
  c('pajamas', 'pijama', 'пижама', 'пиж+ама', 'pajamas', true),
  c('skirt', 'yubka', 'юбка', '+юбка', 'skirt', true),
  c('chapan', 'chopon', 'чапан', 'чап+ан', 'chapan', true),
  c('belt', 'kamar', 'ремень', 'рем+ень', 'belt', true),
  c('apron', 'fartuk', 'фартук', 'ф+артук', 'apron', true),
  c('button', 'tugma', 'пуговица', 'п+уговица', 'button', true),
  c('zipper', 'molniya', 'молния', 'м+олния', 'zipper', true),
  c('pocket', 'choʻntak', 'карман', 'карм+ан', 'pocket', true),
  c('wristwatch', 'qoʻl soati', 'наручные часы', 'нар+учные час+ы', 'watch'),
  c('lab_coat', 'xalat', 'халат', 'хал+ат', 'lab_coat', true),
  c('sunglasses', 'quyosh koʻzoynagi', 'солнечные очки', 'с+олнечные очк+и', 'sunglasses'),
  c('crown', 'toj', 'корона', 'кор+она', 'crown'),
]

const t = mk('toys', 'thing', 'child')
export const TOYS_MORE: Word[] = [
  t('robot', 'robot', 'робот', 'р+обот', 'robot', true),
  t('dinosaur', 'dinozavr', 'динозавр', 'диноз+авр', 't_rex', true),
  t('unicorn', 'yakkashox ot', 'единорог', 'единор+ог', 'unicorn'),
  t('magic_wand', 'sehrli tayoqcha', 'волшебная палочка', 'волшебн+ая п+алочка', 'magic_wand'),
  t('carousel', 'karusel', 'карусель', 'карус+ель', 'carousel_horse', true),
  t('video_game', 'video oʻyin', 'видеоигра', 'видеоигр+а', 'video_game'),
  t('tent', 'chodir', 'палатка', 'пал+атка', 'tent', true),
]
