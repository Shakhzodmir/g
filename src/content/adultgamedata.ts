import type { Bi } from '../i18n/types'
import { syllablesOf } from '../features/games/logic/syllables'
import type { Word } from './types'
import { wordsForKind } from './vocab'

/*
 * Content of the ADULT training games (naming, sentence builder, categories, word-picture, odd one out,
 * listening, everyday situations) and of the adult variants of the shared games.
 *
 * Conventions (same as the rest of the content):
 *  - `uz` is canonical Uzbek Latin (U+02BB in oʻ/gʻ, U+02BC tutuq);
 *  - every Russian text is AUTHORED in its speech form with "+" before the stressed vowel of every word with
 *    two or more vowels (ё carries the stress); the displayed Russian is the same text without "+";
 *  - tone: plain, polite, adult (no diminutives, no cartoon voice);
 *  - every spoken text has an audio key `g.ad.*` (or `w.<id>` for vocabulary words) listed by `adultSpoken()`.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Helpers

/** Russian display text from the speech form. */
export const plain = (ruTts: string): string => ruTts.replace(/\+/g, '')

export interface BiTts extends Bi {
  ruTts: string
}

/** A bilingual text authored as Uzbek + Russian-with-stress. */
export function bt(uz: string, ruTts: string): BiTts {
  return { uz, ru: plain(ruTts), ruTts }
}

export type CatId =
  | 'food'
  | 'fruit'
  | 'veg'
  | 'drinks'
  | 'clothes'
  | 'body'
  | 'animals'
  | 'transport'
  | 'home'
  | 'kitchen'
  | 'health'
  | 'tools'
  | 'tech'
  | 'money'
  | 'stationery'
  | 'hygiene'
  | 'places'

/** A pictured thing used by the adult games: a vocabulary word or one of the game's own items. */
export interface GItem extends Bi {
  /** Unique id; also the audio key of the item's name (`w.<wordId>` or `g.ad.i.<id>`). */
  id: string
  key: string
  ruTts: string
  symbol: string
  /** Curated syllable split ("ol-ma" / "яб-ло-ко"); the heuristic is used when absent. */
  syllables?: Bi
  /** Categories (CATS) this item belongs to. */
  cats: CatId[]
  own: boolean
}

// ---------------------------------------------------------------------------------------------------------------------
// Own items (pictures and names that the shared vocabulary does not have). ref = id inside this table.

interface OwnDef {
  uz: string
  ruTts: string
  symbol: string
}

const own = (uz: string, ruTts: string, symbol: string): OwnDef => ({ uz, ruTts, symbol })

const OWN: Record<string, OwnDef> = {
  // home
  bed: own('karavot', 'кров+ать', 'bed'),
  door: own('eshik', 'дверь', 'door'),
  window: own('deraza', 'окн+о', 'window'),
  key: own('kalit', 'ключ', 'key'),
  mirror: own('koʻzgu', 'з+еркало', 'mirror'),
  lamp: own('lampochka', 'л+ампочка', 'light_bulb'),
  tv: own('televizor', 'телев+изор', 'television'),
  clock: own('soat', 'час+ы', 'alarm_clock'),
  sofa: own('divan', 'див+ан', 'couch_and_lamp'),
  broom: own('supurgi', 'в+еник', 'broom'),
  bucket: own('chelak', 'ведр+о', 'bucket'),
  candle: own('sham', 'свеч+а', 'candle'),
  // kitchen
  pot: own('qozon', 'каз+ан', 'pot_of_food'),
  cup: own('piyola', 'пиал+а', 'teacup_without_handle'),
  spoon: own('qoshiq', 'л+ожка', 'spoon'),
  cutlery: own('vilka va pichoq', 'в+илка и нож', 'fork_and_knife'),
  knife: own('pichoq', 'нож', 'kitchen_knife'),
  bowl: own('kosa', 'м+иска', 'bowl_with_spoon'),
  salt: own('tuz', 'соль', 'salt'),
  // fruit and vegetables that the vocabulary lacks
  pear: own('nok', 'гр+уша', 'pear'),
  strawberry: own('qulupnay', 'клубн+ика', 'strawberry'),
  lemon: own('limon', 'лим+он', 'lemon'),
  cherry: own('gilos', 'черешн+я', 'cherries'),
  onion: own('piyoz', 'лук', 'onion'),
  garlic: own('sarimsoq', 'чесн+ок', 'garlic'),
  pepper: own('qalampir', 'п+ерец', 'bell_pepper'),
  eggplant: own('baqlajon', 'баклаж+ан', 'eggplant'),
  // health
  thermometer: own('termometr', 'термом+етр', 'thermometer'),
  syringe: own('shprits', 'шприц', 'syringe'),
  stethoscope: own('stetoskop', 'стетоск+оп', 'stethoscope'),
  crutch: own('qoʻltiq tayoq', 'кост+ыль', 'crutch'),
  hearing_aid: own('eshitish apparati', 'слухов+ой апп+арат', 'ear_with_hearing_aid'),
  xray: own('rentgen', 'р+ентген', 'x_ray'),
  // tools
  hammer: own('bolgʻa', 'молот+ок', 'hammer'),
  wrench: own('gayka kaliti', 'г+аечный ключ', 'wrench'),
  screwdriver: own('otvyortka', 'отв+ёртка', 'screwdriver'),
  saw: own('arra', 'пил+а', 'carpentry_saw'),
  axe: own('bolta', 'топ+ор', 'axe'),
  toolbox: own('asboblar qutisi', 'ящ+ик с инструм+ентами', 'toolbox'),
  bolt: own('bolt va gayka', 'болт и г+айка', 'nut_and_bolt'),
  // technology
  phone: own('telefon', 'телеф+он', 'mobile_phone'),
  headphones: own('quloqchin', 'н+аушники', 'headphone'),
  keyboard: own('klaviatura', 'клавиат+ура', 'keyboard'),
  mouse: own('kompyuter sichqonchasi', 'компь+ютерная мышь', 'computer_mouse'),
  battery: own('batareya', 'батаре+я', 'battery'),
  printer: own('printer', 'пр+интер', 'printer'),
  // money and shopping
  coin: own('tanga', 'мон+ета', 'coin'),
  banknote: own('pul', 'д+еньги', 'dollar_banknote'),
  card: own('bank kartasi', 'банк+овская к+арта', 'credit_card'),
  bags: own('paket', 'пак+ет', 'shopping_bags'),
  receipt: own('chek', 'чек', 'receipt'),
  bank: own('bank', 'банк', 'bank'),
  scales: own('tarozi', 'вес+ы', 'balance_scale'),
  letter: own('xat', 'письм+о', 'envelope'),
  parcel: own('posilka', 'пос+ылка', 'package'),
  // stationery
  ruler: own('chizgʻich', 'лин+ейка', 'straight_ruler'),
  paperclip: own('skrepka', 'скр+епка', 'paperclip'),
  calendar: own('kalendar', 'календ+арь', 'calendar'),
  newspaper: own('gazeta', 'газ+ета', 'newspaper'),
  // hygiene
  soap: own('sovun', 'м+ыло', 'soap'),
  toothbrush: own('tish choʻtkasi', 'зубн+ая щ+ётка', 'toothbrush'),
  sponge: own('shimgich', 'г+убка', 'sponge'),
  shower: own('dush', 'душ', 'shower'),
  razor: own('ustara', 'бр+итва', 'razor'),
  lotion: own('krem', 'крем', 'lotion_bottle'),
  // transport
  taxi: own('taksi', 'такс+и', 'taxi'),
  metro: own('metro', 'метр+о', 'metro'),
  tram: own('tramvay', 'трамв+ай', 'tram'),
  trolleybus: own('trolleybus', 'тролл+ейбус', 'trolleybus'),
  motorcycle: own('mototsikl', 'мотоц+икл', 'motorcycle'),
  truck: own('yuk mashinasi', 'грузов+ик', 'delivery_truck'),
  tractor: own('traktor', 'тр+актор', 'tractor'),
  ship: own('kema', 'кор+абль', 'ship'),
  // places
  busstop: own('bekat', 'остан+овка', 'bus_stop'),
}

/** Words of the shared vocabulary that are not for adults even if their audience flag says "both". */
const CHILD_REGISTER_IDS = new Set([
  'mother_oyi', 'father_dada', 'kg_teacher', 'teddy', 'doll', 'blocks', 'bubbles', 'kite', 'slide', 'drum', 'balloon', 'puzzle',
  'hide_and_seek', 'cartoon', 'ball', 'kindergarten', 'letters', 'numbers', 'lesson', 'break', 'turn', 'younger_brother', 'younger_sister',
  'baby', 'child', 'spilled', 'speech_therapist',
])
/** Toys-topic words that are real vehicles and so fine for adults. */
const ADULT_KEEP_IDS = new Set(['car', 'train', 'airplane', 'helicopter', 'bicycle', 'bus', 'ambulance', 'music'])
const CHILD_TOPICS = new Set(['toys', 'school'])
const ADULT_KEEP_SCHOOL = new Set(['book', 'pencil', 'pen', 'notebook', 'scissors', 'chair', 'computer', 'picture', 'backpack'])

/** Is this vocabulary word suitable (and picturable) for the adult training games? */
export function isAdultPicturable(w: Word): boolean {
  if (w.fitz !== 'thing' && w.fitz !== 'people') return false
  if (CHILD_REGISTER_IDS.has(w.id)) return false
  if (CHILD_TOPICS.has(w.topic) && !ADULT_KEEP_IDS.has(w.id) && !ADULT_KEEP_SCHOOL.has(w.id)) return false
  return true
}

/** The adult word pool: wordsForKind('adult') minus the child register, picturable things and people only. */
export function adultWordPool(): Word[] {
  return wordsForKind('adult').filter(isAdultPicturable)
}

// ---------------------------------------------------------------------------------------------------------------------
// Categories

export interface CatDef {
  id: CatId
  title: BiTts
  /** "Find all …" prompt of the category game (spoken). */
  find: BiTts
  /** "Which one is …?" question of the listening game (spoken). */
  q: BiTts
  /** Members: "$wordId" for a vocabulary word, otherwise a key of OWN. */
  members: string[]
  /** Neighbouring categories: their members make good (hard) distractors. */
  near: CatId[]
}

export const CATS: CatDef[] = [
  {
    id: 'food',
    title: bt('Ovqat', 'Ед+а'),
    find: bt('Ovqatlarni toping', 'Найд+ите ед+у'),
    q: bt('Qaysi biri ovqat?', 'Что из +этого ед+а?'),
    members: ['$bread', '$plov', '$somsa', '$soup', '$manti', '$lagman', '$rice', '$meat', '$egg', '$sweets', '$ice_cream'],
    near: ['fruit', 'veg', 'drinks'],
  },
  {
    id: 'fruit',
    title: bt('Meva', 'Фр+укты'),
    find: bt('Mevalarni toping', 'Найд+ите фр+укты'),
    q: bt('Qaysi biri meva?', 'Что из +этого фрукт?'),
    members: ['$apple', '$banana', '$grapes', '$pomegranate', '$peach', '$melon', '$watermelon', 'pear', 'strawberry', 'lemon', 'cherry'],
    near: ['veg', 'food', 'drinks'],
  },
  {
    id: 'veg',
    title: bt('Sabzavot', '+Овощи'),
    find: bt('Sabzavotlarni toping', 'Найд+ите +овощи'),
    q: bt('Qaysi biri sabzavot?', 'Что из +этого +овощ?'),
    members: ['$carrot', '$potato', '$tomato', '$cucumber', 'onion', 'garlic', 'pepper', 'eggplant'],
    near: ['fruit', 'food'],
  },
  {
    id: 'drinks',
    title: bt('Ichimlik', 'Нап+итки'),
    find: bt('Ichimliklarni toping', 'Найд+ите нап+итки'),
    q: bt('Qaysi biri ichimlik?', 'Что из +этого нап+иток?'),
    members: ['$water', '$tea', '$milk', '$juice', '$compote', '$cocoa', '$katyk', '$lemonade'],
    near: ['food', 'fruit', 'kitchen'],
  },
  {
    id: 'clothes',
    title: bt('Kiyim', 'Од+ежда'),
    find: bt('Kiyimlarni toping', 'Найд+ите од+ежду'),
    q: bt('Qaysi biri kiyim?', 'Что из +этого од+ежда?'),
    members: ['$dress', '$trousers', '$jacket', '$socks', '$shoes', '$boots', '$gloves', '$scarf', '$cap', '$doppi', '$tshirt', '$slippers', '$shorts'],
    near: ['hygiene', 'body'],
  },
  {
    id: 'body',
    title: bt('Tana aʼzolari', 'Ч+асти т+ела'),
    find: bt('Tana aʼzolarini toping', 'Найд+ите ч+асти т+ела'),
    q: bt('Qaysi biri tana aʼzosi?', 'Что из +этого часть т+ела?'),
    members: ['$head', '$eye', '$ear', '$nose', '$mouth', '$teeth', '$tongue', '$hand', '$finger', '$leg', '$tummy', '$hair'],
    near: ['health', 'clothes'],
  },
  {
    id: 'animals',
    title: bt('Hayvonlar', 'Жив+отные'),
    find: bt('Hayvonlarni toping', 'Найд+ите жив+отных'),
    q: bt('Qaysi biri hayvon?', 'Что из +этого жив+отное?'),
    members: ['$cat', '$dog', '$cow', '$sheep', '$goat', '$horse', '$donkey', '$camel', '$chicken', '$rooster', '$duck', '$fish', '$rabbit'],
    near: ['food'],
  },
  {
    id: 'transport',
    title: bt('Transport', 'Тр+анспорт'),
    find: bt('Transport vositalarini toping', 'Найд+ите тр+анспорт'),
    q: bt('Qaysi biri transport?', 'Что из +этого тр+анспорт?'),
    members: ['$car', '$bus', '$train', '$airplane', '$bicycle', '$helicopter', '$ambulance', 'taxi', 'metro', 'tram', 'trolleybus', 'motorcycle', 'truck', 'tractor', 'ship'],
    near: ['places'],
  },
  {
    id: 'home',
    title: bt('Uy buyumlari', 'Предм+еты д+ома'),
    find: bt('Uy buyumlarini toping', 'Найд+ите предм+еты д+ома'),
    q: bt('Qaysi biri uy buyumi?', 'Что из +этого предм+ет д+ома?'),
    members: ['bed', 'door', 'window', 'key', 'mirror', 'lamp', 'tv', 'clock', 'sofa', '$chair', 'broom', 'bucket', 'candle'],
    near: ['kitchen', 'hygiene', 'tools', 'tech'],
  },
  {
    id: 'kitchen',
    title: bt('Oshxona buyumlari', 'К+ухонные предм+еты'),
    find: bt('Oshxona buyumlarini toping', 'Найд+ите к+ухонные предм+еты'),
    q: bt('Qaysi biri oshxona buyumi?', 'Что из +этого к+ухонный предм+ет?'),
    members: ['pot', '$teapot', 'cup', 'spoon', 'cutlery', 'knife', 'bowl', '$glass', 'salt'],
    near: ['home', 'drinks', 'tools'],
  },
  {
    id: 'health',
    title: bt('Tibbiyot', 'Медиц+ина'),
    find: bt('Tibbiyotga oid narsalarni toping', 'Найд+ите всё, что относ+ится к медиц+ине'),
    q: bt('Qaysi biri tibbiyotga oid?', 'Что из +этого относ+ится к медиц+ине?'),
    members: ['$medicine', '$plaster', 'thermometer', 'syringe', 'stethoscope', 'crutch', 'hearing_aid', '$glasses', 'xray', '$doctor', '$nurse', '$hospital'],
    near: ['hygiene', 'body'],
  },
  {
    id: 'tools',
    title: bt('Asboblar', 'Инструм+енты'),
    find: bt('Asboblarni toping', 'Найд+ите инструм+енты'),
    q: bt('Qaysi biri asbob?', 'Что из +этого инструм+ент?'),
    members: ['hammer', 'wrench', 'screwdriver', 'saw', 'axe', 'toolbox', 'bolt', '$scissors'],
    near: ['kitchen', 'home', 'stationery'],
  },
  {
    id: 'tech',
    title: bt('Texnika', 'Т+ехника'),
    find: bt('Texnika va aloqa vositalarini toping', 'Найд+ите т+ехнику и ср+едства св+язи'),
    q: bt('Qaysi biri texnika?', 'Что из +этого т+ехника?'),
    members: ['phone', '$computer', 'headphones', 'keyboard', 'mouse', 'battery', 'printer', 'tv'],
    near: ['home', 'money', 'stationery'],
  },
  {
    id: 'money',
    title: bt('Pul va xarid', 'Д+еньги и пок+упки'),
    find: bt('Pul va xarid bilan bogʻliq narsalarni toping', 'Найд+ите всё, что св+язано с д+еньгами и пок+упками'),
    q: bt('Qaysi biri pul bilan bogʻliq?', 'Что из +этого св+язано с д+еньгами?'),
    members: ['coin', 'banknote', 'card', 'bags', 'receipt', 'bank', 'scales', '$shop'],
    near: ['tech', 'stationery', 'places'],
  },
  {
    id: 'stationery',
    title: bt('Yozuv-chizuv buyumlari', 'Канцел+ярия'),
    find: bt('Yozuv-chizuv buyumlarini toping', 'Найд+ите канцел+ярские предм+еты'),
    q: bt('Qaysi biri yozuv-chizuv buyumi?', 'Что из +этого канцел+ярский предм+ет?'),
    members: ['$pen', '$pencil', '$notebook', '$book', '$scissors', 'ruler', 'paperclip', 'calendar', 'newspaper', 'letter', 'parcel'],
    near: ['tech', 'tools', 'money'],
  },
  {
    id: 'hygiene',
    title: bt('Gigiyena', 'Гигиен+а'),
    find: bt('Gigiyena vositalarini toping', 'Найд+ите ср+едства гигиен+ы'),
    q: bt('Qaysi biri gigiyena vositasi?', 'Что из +этого ср+едство гигиен+ы?'),
    members: ['soap', 'toothbrush', 'sponge', 'shower', 'razor', 'lotion', '$toilet'],
    near: ['health', 'home', 'body'],
  },
  {
    id: 'places',
    title: bt('Joylar', 'Мест+а'),
    find: bt('Joylarni toping', 'Найд+ите мест+а'),
    q: bt('Qaysi biri joy?', 'Что из +этого м+есто?'),
    members: ['$home', '$hospital', '$school', '$shop', '$bazaar', '$park', '$pool', '$barbershop', 'bank', 'busstop'],
    near: ['transport', 'money'],
  },
]

/** Vocabulary topic -> category for words that no category lists by name. */
const EXTRA_CAT: Record<string, CatId> = {
  animals: 'animals',
  clothes: 'clothes',
  places: 'places',
  food: 'food',
  drinks: 'drinks',
  medicine: 'health',
  hospital: 'health',
  home: 'home',
  kitchen: 'food',
  dishes: 'kitchen',
  needs: 'hygiene',
  shopping: 'money',
  bank: 'money',
  transport: 'transport',
  phone: 'tech',
  city: 'places',
}

/** Shared (child + adult) topics whose picturable words are all good naming targets. */
const SHARED_EXTRA_TOPICS = new Set(['animals', 'clothes', 'places', 'food', 'drinks'])

const ids = (s: string) => new Set(s.split(/s+/).filter(Boolean))
/** Adult-vocabulary topics: only these ids are concrete, picturable things (the rest are labels, procedures, documents). */
const EXTRA_BY_TOPIC: Record<string, Set<string>> = {
  home: ids('ho_bed ho_sofa ho_table ho_wardrobe ho_mirror ho_door ho_window ho_key ho_lock ho_light ho_socket ho_tv ho_remote ho_radio ho_aircon ho_heater ho_fridge ho_washer ho_pillow ho_blanket ho_bin ho_broom ho_stairs ho_balcony'),
  kitchen: ids('k_mastava k_dimlama k_shashlik k_broth k_porridge k_butter k_oil k_cheese k_salt k_sugar k_honey k_jam k_sour_cream k_flour k_chicken k_salad k_walnut k_lemon'),
  dishes: ids('d_spoon d_fork d_knife d_plate d_piala d_bowl d_mug d_cauldron d_pan d_tablecloth d_straw'),
  medicine: ids('m_tablet m_injection m_drops m_syrup m_ointment m_inhaler m_vitamins m_thermometer m_tonometer m_pill_box'),
  hospital: ids('hs_wheelchair hs_crutch hs_hearing_aid hs_prosthesis hs_xray'),
  needs: ids('n_towel n_soap n_shampoo n_toothpaste n_comb n_razor n_toilet_paper n_wipes n_dentures n_battery'),
  shopping: ids('sh_basket sh_receipt sh_bag sh_handbag sh_wallet sh_card sh_cash sh_supermarket sh_bakery'),
  transport: ids('tr_taxi tr_metro tr_tram tr_minibus tr_motorbike tr_stop tr_traffic_light tr_station tr_airport'),
  phone: ids('ph_phone ph_laptop ph_keyboard ph_mouse ph_camera ph_charge'),
  bank: ids('b_bank b_atm b_passport b_envelope'),
  city: ids('ci_library ci_theatre ci_cinema ci_museum ci_restaurant ci_teahouse ci_cafe ci_hotel ci_stadium ci_university ci_building ci_bridge'),
}

export const CAT_BY_ID: Record<CatId, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c])) as Record<CatId, CatDef>

// ---------------------------------------------------------------------------------------------------------------------
// The catalog (resolved items). Computed lazily because the vocabulary can grow (adult content is added elsewhere).

export const ownKey = (ref: string): string => `g.ad.i.${ref}`

function fromWord(w: Word): GItem {
  return {
    id: `w.${w.id}`,
    key: `w.${w.id}`,
    uz: w.uz,
    ru: w.ru,
    ruTts: w.ruTts ?? w.ru,
    symbol: w.symbol,
    syllables: w.syllables,
    cats: [],
    own: false,
  }
}

function fromOwn(ref: string, d: OwnDef): GItem {
  return { id: ownKey(ref), key: ownKey(ref), uz: d.uz, ru: plain(d.ruTts), ruTts: d.ruTts, symbol: d.symbol, cats: [], own: true }
}

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’'`]/g, '')

interface Catalog {
  items: GItem[]
  byId: Map<string, GItem>
  byCat: Map<CatId, GItem[]>
  /** Member ref ("$word" or own key) -> the resolved item (a vocabulary word replaces an own item with the same name). */
  byRef: Map<string, GItem>
}

let cached: Catalog | null = null
let cachedFor = -1

/** Resolves a member reference to an item (null when the word does not exist or is not for adults). */
function resolveRef(ref: string, pool: Map<string, Word>): GItem | null {
  if (ref.startsWith('$')) {
    const w = pool.get(ref.slice(1))
    return w ? fromWord(w) : null
  }
  const d = OWN[ref]
  if (!d) return null
  // The vocabulary got the same thing (same Uzbek or Russian text): use the word, so there is one clip and one picture.
  for (const w of pool.values()) {
    if (w.fitz === 'thing' && (norm(w.uz) === norm(d.uz) || norm(w.ru) === norm(plain(d.ruTts)))) return fromWord(w)
  }
  return fromOwn(ref, d)
}

export function catalog(): Catalog {
  const words = adultWordPool()
  if (cached && cachedFor === words.length) return cached
  const pool = new Map(words.map((w) => [w.id, w]))
  const items: GItem[] = []
  const byId = new Map<string, GItem>()
  const byCat = new Map<CatId, GItem[]>()
  const byRef = new Map<string, GItem>()
  const add = (it: GItem): GItem => {
    const have = byId.get(it.id)
    if (have) return have
    byId.set(it.id, it)
    items.push(it)
    return it
  }
  for (const cat of CATS) {
    const list: GItem[] = []
    for (const ref of cat.members) {
      const r = resolveRef(ref, pool)
      if (!r) continue
      const it = add(r)
      byRef.set(ref, it)
      if (!it.cats.includes(cat.id)) it.cats.push(cat.id)
      if (!list.includes(it)) list.push(it)
    }
    byCat.set(cat.id, list)
  }
  // Adult words that no category lists (new adult content) are still good naming targets; their topic decides the category.
  for (const w of words) {
    if (byId.has(`w.${w.id}`) || w.fitz !== 'thing') continue
    // Only concrete, picturable things: the adult vocabulary is mostly labels (diagnoses, procedures, documents).
    if (EXTRA_BY_TOPIC[w.topic] ? !EXTRA_BY_TOPIC[w.topic].has(w.id) : !SHARED_EXTRA_TOPICS.has(w.topic)) continue
    const it = add(fromWord(w))
    const cat = EXTRA_CAT[w.topic]
    if (cat && !it.cats.includes(cat)) {
      it.cats.push(cat)
      byCat.get(cat)?.push(it)
    }
  }
  cached = { items, byId, byCat, byRef }
  cachedFor = words.length
  return cached
}

/** All pictured things for the adult games (categorised first). */
export function adultItems(): GItem[] {
  return catalog().items
}

export function itemById(id: string): GItem | undefined {
  return catalog().byId.get(id)
}

export function catItems(id: CatId): GItem[] {
  return catalog().byCat.get(id) ?? []
}

/** Categories that have at least `min` members in the catalog. */
export function usableCats(min = 4): CatDef[] {
  return CATS.filter((c) => catItems(c.id).length >= min)
}

/** An item by ref for curated content (questions, commands). */
export function refItem(ref: string): GItem | undefined {
  const c = catalog()
  const known = c.byRef.get(ref)
  if (known) return known
  if (ref.startsWith('$')) {
    const w = adultWordPool().find((x) => x.id === ref.slice(1))
    return w ? fromWord(w) : undefined
  }
  return OWN[ref] ? c.byId.get(ownKey(ref)) : undefined
}

// ---------------------------------------------------------------------------------------------------------------------
// Naming: cue ladder material

const UZ_FIRST = /^(sh|ch|oʻ|gʻ|ng|[a-z])/i

/** First letter(s) of a text (digraphs sh/ch/oʻ/gʻ count as one letter). */
export function firstLetters(text: string, lang: 'uz' | 'ru'): string {
  const t = text.trim()
  if (lang === 'ru') return t.slice(0, 1)
  return UZ_FIRST.exec(t)?.[0] ?? t.slice(0, 1)
}

/** Syllables of an item's first word in the speech language. */
export function itemSyllables(item: GItem, lang: 'uz' | 'ru'): string[] {
  return syllablesOf({ uz: item.uz, ru: item.ru, syllables: item.syllables }, lang)
}

/** Cue 1 (shown): the first syllable, or the first letter(s) of a one-syllable word. */
export function cueFirst(item: GItem, lang: 'uz' | 'ru'): string {
  const s = itemSyllables(item, lang)
  if (s.length >= 2) return s[0]
  return firstLetters(lang === 'uz' ? item.uz : item.ru, lang)
}

/** Cue 2 (spoken first syllable) exists for words of two syllables or more whose first syllable is long enough to be heard (not a lone vowel). */
export function hasSpokenCue(item: GItem): boolean {
  const uz = itemSyllables(item, 'uz')
  const ru = itemSyllables(item, 'ru')
  return uz.length >= 2 && ru.length >= 2 && uz[0].length >= 2 && ru[0].length >= 2
}

export const cueKey = (item: GItem): string => `g.ad.n1.${item.id.replace(/^w\./, '').replace(/^g\.ad\.i\./, 'i.')}`

/** Sentence-completion frames (cue 3). The last word of a frame is left for the person to say. */
export const FRAMES: Record<string, BiTts> = {
  write: bt('Biz bu bilan yozamiz. Bu —', 'Им п+ишут. +Это —'),
  cut: bt('Biz bu bilan kesamiz. Bu —', 'Им р+ежут. +Это —'),
  eat: bt('Biz bu bilan shoʻrva yeymiz. Bu —', 'Им ед+ят суп. +Это —'),
  hammer: bt('Biz bu bilan mix qoqamiz. Bu —', 'Им забив+ают гвозд+и. +Это —'),
  screw: bt('Biz bu bilan vint buraymiz. Bu —', 'Им закр+учивают винт+ы. +Это —'),
  saw: bt('Biz bu bilan yogʻoch kesamiz. Bu —', 'Им п+илят д+ерево. +Это —'),
  call: bt('Biz bu bilan qoʻngʻiroq qilamiz. Bu —', 'Им звон+ят. +Это —'),
  temp: bt('Bu bilan haroratni oʻlchaymiz. Bu —', 'Им м+еряют температ+уру. +Это —'),
  shot: bt('Bu bilan inyeksiya qilinadi. Bu —', 'Им д+елают ук+ол. +Это —'),
  listen: bt('Shifokor bu bilan yurak va oʻpkani tinglaydi. Bu —', 'Им врач слуш+ает с+ердце и л+ёгкие. +Это —'),
  walk: bt('Yurganda bunga suyanamiz. Bu —', 'На нег+о опир+аются при ходьб+е. +Это —'),
  lock: bt('Biz bu bilan eshikni ochamiz. Bu —', 'Им отпир+ают дверь. +Это —'),
  time: bt('Bu vaqtni koʻrsatadi. Bu —', 'По ним см+отрят вр+емя. +Это —'),
  tv: bt('Biz bunda film koʻramiz. Bu —', 'Тут см+отрят фильм. +Это —'),
  light: bt('Bu xonani yoritadi. Bu —', 'Он освещ+ает к+омнату. +Это —'),
  bed: bt('Biz bunda uxlaymiz. Bu —', 'На нём спят. +Это —'),
  mirror: bt('Biz bunda oʻzimizni koʻramiz. Bu —', 'В нём в+идно себ+я. +Это —'),
  doorway: bt('Biz bu orqali xonaga kiramiz. Bu —', 'Мы вх+одим в к+омнату. +Это —'),
  look_out: bt('Biz bu orqali koʻchaga qaraymiz. Bu —', 'Ч+ерез нег+о см+отрят на ул+ицу. +Это —'),
  bucket: bt('Biz bunga suv quyamiz. Bu —', 'В нег+о налив+ают вод+у. +Это —'),
  sweep: bt('Biz bu bilan polni supuramiz. Bu —', 'Им подмет+ают пол. +Это —'),
  wash: bt('Biz bu bilan qoʻl yuvamiz. Bu —', 'Им м+оют р+уки. +Это —'),
  teeth: bt('Biz bu bilan tish tozalaymiz. Bu —', '+Ею ч+истят з+убы. +Это —'),
  shower: bt('Biz bunda yuvinamiz. Bu —', 'Тут м+оются. +Это —'),
  shave: bt('Bu bilan soqol olinadi. Bu —', 'Им бр+еют б+ороду. +Это —'),
  music: bt('Biz bu bilan musiqa tinglaymiz. Bu —', 'В них слуш+ают м+узыку. +Это —'),
  type: bt('Biz bunda matn yozamiz. Bu —', 'На ней печ+атают текст. +Это —'),
  power: bt('Bu qurilmaga quvvat beradi. Bu —', 'Он+а да+ёт эн+ергию. +Это —'),
  pay: bt('Biz bu bilan toʻlov qilamiz. Bu —', '+Ею плат+ят в магаз+ине. +Это —'),
  mail: bt('Bunga xat solamiz. Bu —', 'В нег+о кл+адут письм+о. +Это —'),
  dates: bt('Bunda sanalar yozilgan. Bu —', 'В нём д+аты и дни. +Это —'),
  news: bt('Biz buni oʻqiymiz. Bu —', 'В ней нов+ости. +Это —'),
  line: bt('Biz bu bilan chiziq chizamiz. Bu —', '+Ею ч+ертят л+инии. +Это —'),
  bones: bt('Bu suratda suyaklar koʻrinadi. Bu —', 'На нём видн+ы к+ости. +Это —'),
  hear: bt('Bu bilan yaxshiroq eshitamiz. Bu —', 'С ним л+учше сл+ышат. +Это —'),
  pills: bt('Biz buni kasallikda ichamiz. Bu —', '+Его пьют при бол+езни. +Это —'),
  patch: bt('Bu jarohatga yopishtiriladi. Bu —', '+Его накл+еивают на р+ану. +Это —'),
  see: bt('Biz buni yaxshiroq koʻrish uchun taqamiz. Bu —', 'Их н+осят, чт+обы л+учше в+идеть. +Это —'),
  treat: bt('Bu yerda bemorlarni davolashadi. Bu —', 'Здесь леч+ат больн+ых. +Это —'),
  // category-level frames
  c_food: bt('Buni yeymiz. Bu —', '+Это ед+ят. +Это —'),
  c_drinks: bt('Buni ichamiz. Bu —', '+Это пьют. +Это —'),
  c_fruit: bt('Bu meva. U —', '+Это фрукт. +Это —'),
  c_veg: bt('Bu sabzavot. U —', '+Это +овощ. +Это —'),
  c_clothes: bt('Buni kiyamiz. Bu —', '+Это надев+ают. +Это —'),
  c_transport: bt('Bunda yuramiz. Bu —', 'На +этом +ездят. +Это —'),
  c_animals: bt('Bu hayvon. U —', '+Это жив+отное. +Это —'),
  c_body: bt('Bu tana aʼzosi. U —', '+Это часть т+ела. +Это —'),
  c_places: bt('Bu joy. U —', '+Это м+есто. +Это —'),
  c_home: bt('Bu uy buyumi. U —', '+Это предм+ет д+ома. +Это —'),
  c_kitchen: bt('Bu oshxona buyumi. U —', '+Это к+ухонный предм+ет. +Это —'),
  c_health: bt('Bu tibbiyotga oid. U —', '+Это относ+ится к медиц+ине. +Это —'),
  c_tools: bt('Bu asbob. U —', '+Это инструм+ент. +Это —'),
  c_tech: bt('Bu texnika. U —', '+Это т+ехника. +Это —'),
  c_money: bt('Bu pul bilan bogʻliq. U —', '+Это св+язано с д+еньгами. +Это —'),
  c_stationery: bt('Bu yozuv-chizuv buyumi. U —', '+Это канцел+ярский предм+ет. +Это —'),
  c_hygiene: bt('Bu gigiyena vositasi. U —', '+Это ср+едство гигиен+ы. +Это —'),
}

/** Item-specific frame (by ref); everything else gets the frame of its first category. */
const FRAME_OF: Record<string, string> = {
  $pen: 'write', $pencil: 'write', knife: 'cut', spoon: 'eat', hammer: 'hammer', screwdriver: 'screw', saw: 'saw', phone: 'call',
  thermometer: 'temp', syringe: 'shot', stethoscope: 'listen', crutch: 'walk', key: 'lock', clock: 'time', tv: 'tv', lamp: 'light',
  bed: 'bed', mirror: 'mirror', door: 'doorway', window: 'look_out', bucket: 'bucket', broom: 'sweep', soap: 'wash', toothbrush: 'teeth',
  shower: 'shower', razor: 'shave', headphones: 'music', keyboard: 'type', battery: 'power', card: 'pay', letter: 'mail', calendar: 'dates',
  newspaper: 'news', ruler: 'line', xray: 'bones', hearing_aid: 'hear', $medicine: 'pills', $plaster: 'patch', $glasses: 'see', $hospital: 'treat',
}

const REF_BY_ITEM = (): Map<string, string> => {
  const m = new Map<string, string>()
  for (const cat of CATS) {
    for (const ref of cat.members) {
      const it = refItem(ref)
      if (it && !m.has(it.id)) m.set(it.id, ref)
    }
  }
  return m
}

let refCache: Map<string, string> | null = null
let refCacheFor = -1

/** The frame id of an item, or null when the item has none (no sentence-completion cue then). */
export function frameIdOf(item: GItem): string | null {
  const size = catalog().items.length
  if (!refCache || refCacheFor !== size) {
    refCache = REF_BY_ITEM()
    refCacheFor = size
  }
  const ref = refCache.get(item.id)
  if (ref && FRAME_OF[ref]) return FRAME_OF[ref]
  const cat = item.cats[0]
  if (cat && FRAMES[`c_${cat}`]) return `c_${cat}`
  return null
}

export const frameKey = (id: string): string => `g.ad.f.${id}`

// ---------------------------------------------------------------------------------------------------------------------
// Sentence builder

export interface SentenceDef {
  id: string
  /** Chunk cards in the right order, Russian in speech form (with "+"). */
  uz: string[]
  ru: string[]
}

const s = (id: string, uz: string[], ru: string[]): SentenceDef => ({ id, uz, ru })

export const SENTENCES: SentenceDef[] = [
  // 3 chunks
  s('s3_home', ['Men', 'uyga', 'ketyapman'], ['Я', 'ид+у', 'д+омой']),
  s('s3_hot', ['Bugun', 'havo', 'issiq'], ['Сег+одня', 'на ул+ице', 'тепл+о']),
  s('s3_doctor', ['Shifokor', 'meni', 'koʻradi'], ['Врач', 'осм+отрит', 'мен+я']),
  s('s3_pill', ['Men', 'dori', 'ichaman'], ['Я', 'приним+аю', 'лек+арство']),
  s('s3_family', ['Oilam', 'meni', 'kutyapti'], ['Семь+я', 'мен+я', 'ждёт']),
  s('s3_phone', ['Telefon', 'stol', 'ustida'], ['Телеф+он', 'леж+ит', 'на стол+е']),
  s('s3_water', ['Men', 'suv', 'ichmoqchiman'], ['Я', 'хоч+у', 'пить']),
  // 4 chunks
  s('s4_bazaar', ['Men', 'bugun', 'bozorga', 'boraman'], ['Сег+одня', 'я', 'пойд+у', 'на баз+ар']),
  s('s4_water', ['Iltimos,', 'menga', 'bir stakan', 'suv bering'], ['Д+айте', 'мне', 'стак+ан', 'вод+ы']),
  s('s4_recipe', ['Shifokor', 'menga', 'yangi', 'dori yozdi'], ['Врач', 'в+ыписал', 'мне', 'нов+ое лек+арство']),
  s('s4_wake', ['Ertaga', 'soat', 'oltida', 'uygʻonaman'], ['З+автра', 'я', 'просн+усь', 'в шесть']),
  s('s4_dinner', ['Biz', 'kechqurun', 'birga', 'ovqatlanamiz'], ['В+ечером', 'мы', 'вм+есте', '+ужинаем']),
  s('s4_bread', ['Men', 'doʻkondan', 'non', 'sotib olaman'], ['Я', 'купл+ю', 'хлеб', 'в магаз+ине']),
  s('s4_table', ['Mening', 'telefonim', 'stol ustida', 'turibdi'], ['Мой', 'телеф+он', 'леж+ит', 'на стол+е']),
  // 5 chunks
  s('s5_clinic', ['Men', 'bugun', 'shifokorga', 'uchrashuvga', 'boraman'], ['Сег+одня', 'я', 'ид+у', 'к врач+у', 'на при+ём']),
  s('s5_warm', ['Iltimos,', 'menga', 'bir stakan', 'iliq', 'suv bering'], ['Д+айте', 'мне,', 'пож+алуйста,', 'стак+ан', 'т+ёплой вод+ы']),
  s('s5_visit', ['Oilam', 'shanba kuni', 'meni', 'koʻrgani', 'keladi'], ['Мо+я', 'семь+я', 'прид+ёт', 'ко мне', 'в суббот+у']),
  s('s5_breakfast', ['Men', 'ertalab', 'choy', 'bilan', 'non yeyman'], ['+Утром', 'я', 'ем', 'хлеб', 'с ч+аем']),
  s('s5_walk', ['Doktor', 'menga', 'har kuni', 'sayr qilishni', 'maslahat beradi'], ['Врач', 'сов+етует', 'мне', 'гул+ять', 'к+аждый день']),
  s('s5_stop', ['Bekat', 'bizning', 'uyimizga', 'juda', 'yaqin'], ['Остан+овка', 'р+ядом', 'с', 'н+ашим', 'д+омом']),
  s('s5_morning', ['Men', 'har kuni', 'ertalab', 'dorimni', 'ichaman'], ['Я', 'к+аждое', '+утро', 'пью', 'лек+арство']),
]

export const sentenceKey = (id: string): string => `g.ad.s.${id}`

// ---------------------------------------------------------------------------------------------------------------------
// Listening comprehension

export interface QaDef {
  id: string
  q: BiTts
  /** Ref of the right picture. */
  answer: string
  /** Refs of the wrong pictures. */
  others: string[]
}

export const QA: QaDef[] = [
  { id: 'write', q: bt('Nima bilan yozamiz?', 'Чем п+ишут?'), answer: '$pen', others: ['spoon', 'key', 'soap', 'hammer'] },
  { id: 'bread', q: bt('Nonni nima bilan kesamiz?', 'Чем р+ежут хлеб?'), answer: 'knife', others: ['hammer', '$pencil', 'soap', 'key'] },
  { id: 'phone', q: bt('Qoʻngʻiroq qilish uchun nima kerak?', 'Что нужн+о, чт+обы позвон+ить?'), answer: 'phone', others: ['spoon', '$shoes', 'soap', 'hammer'] },
  { id: 'drink', q: bt('Suvni nimadan ichamiz?', 'Из чег+о пьют вод+у?'), answer: '$glass', others: ['knife', 'hammer', 'key', '$shoes'] },
  { id: 'door', q: bt('Eshikni nima bilan ochamiz?', 'Чем открыв+ают дверь?'), answer: 'key', others: ['spoon', '$pen', 'thermometer', 'soap'] },
  { id: 'temp', q: bt('Haroratni nima bilan oʻlchaymiz?', 'Чем м+еряют температ+уру?'), answer: 'thermometer', others: ['hammer', 'spoon', 'key', '$pen'] },
  { id: 'teeth', q: bt('Tishni nima bilan tozalaymiz?', 'Чем ч+истят з+убы?'), answer: 'toothbrush', others: ['broom', '$pen', 'hammer', 'spoon'] },
  { id: 'hands', q: bt('Qoʻlni nima bilan yuvamiz?', 'Чем м+оют р+уки?'), answer: 'soap', others: ['$pen', 'hammer', 'key', '$shoes'] },
  { id: 'floor', q: bt('Polni nima bilan supuramiz?', 'Чем подмет+ают пол?'), answer: 'broom', others: ['spoon', '$pen', 'phone', 'key'] },
  { id: 'nail', q: bt('Mixni nima bilan qoqamiz?', 'Чем забив+ают гвозд+и?'), answer: 'hammer', others: ['spoon', '$pen', 'soap', '$scissors'] },
  { id: 'soup', q: bt('Shoʻrvani nima bilan yeymiz?', 'Чем ед+ят суп?'), answer: 'spoon', others: ['hammer', '$pen', 'key', '$shoes'] },
  { id: 'money', q: bt('Qayerda pul olsa boʻladi?', 'Где м+ожно получ+ить д+еньги?'), answer: 'bank', others: ['$hospital', '$school', '$park', '$pool'] },
  { id: 'treat', q: bt('Bemorni qayerda davolashadi?', 'Где леч+ат больн+ых?'), answer: '$hospital', others: ['bank', '$school', '$shop', '$park'] },
  { id: 'buy', q: bt('Mahsulotni qayerda sotib olamiz?', 'Где покуп+ают прод+укты?'), answer: '$shop', others: ['$hospital', 'bank', '$pool', '$school'] },
  { id: 'look', q: bt('Koʻchaga nima orqali qaraymiz?', 'Ч+ерез что см+отрят на ул+ицу?'), answer: 'window', others: ['door', 'mirror', 'tv', 'lamp'] },
  { id: 'self', q: bt('Oʻzimizni nimadan koʻramiz?', 'В чём мы в+идим себ+я?'), answer: 'mirror', others: ['tv', 'window', 'door', 'lamp'] },
]

export interface PlaceOption {
  id: string
  text: BiTts
}

export const LOCS: Record<string, PlaceOption> = {
  table: { id: 'table', text: bt('Stolda', 'На стол+е') },
  shelf: { id: 'shelf', text: bt('Javonda', 'На п+олке') },
  wardrobe: { id: 'wardrobe', text: bt('Shkafda', 'В шкаф+у') },
  bag: { id: 'bag', text: bt('Sumkada', 'В с+умке') },
  drawer: { id: 'drawer', text: bt('Tortmada', 'В +ящике') },
  window: { id: 'window', text: bt('Deraza yonida', 'У окн+а') },
  bed: { id: 'bed', text: bt('Karavot ustida', 'На кроват+и') },
  door: { id: 'door', text: bt('Eshik yonida', 'У дв+ери') },
  pocket: { id: 'pocket', text: bt('Choʻntakda', 'В карм+ане') },
}

export interface PlaceQDef {
  id: string
  /** Statement + question (spoken in one clip). */
  text: BiTts
  answer: string
  other: string
}

export const PLACE_Q: PlaceQDef[] = [
  { id: 'p1', text: bt('Telefon stolda, kalit sumkada. Telefon qayerda?', 'Телеф+он на стол+е, ключ в с+умке. Где телеф+он?'), answer: 'table', other: 'bag' },
  { id: 'p2', text: bt('Dori javonda, suv stolda. Dori qayerda?', 'Лек+арство на п+олке, вод+а на стол+е. Где лек+арство?'), answer: 'shelf', other: 'table' },
  { id: 'p3', text: bt('Koʻzoynak karavot ustida, kitob tortmada. Kitob qayerda?', 'Очк+и на кроват+и, кн+ига в +ящике. Где кн+ига?'), answer: 'drawer', other: 'bed' },
  { id: 'p4', text: bt('Pul choʻntakda, hujjat sumkada. Hujjat qayerda?', 'Д+еньги в карм+ане, докум+ент в с+умке. Где докум+ент?'), answer: 'bag', other: 'pocket' },
  { id: 'p5', text: bt('Kalit eshik yonida, telefon deraza yonida. Kalit qayerda?', 'Ключ у дв+ери, телеф+он у окн+а. Где ключ?'), answer: 'door', other: 'window' },
  { id: 'p6', text: bt('Choynak stolda, piyola shkafda. Piyola qayerda?', 'Ч+айник на стол+е, пиал+а в шкаф+у. Где пиал+а?'), answer: 'wardrobe', other: 'table' },
  { id: 'p7', text: bt('Gazeta javonda, soat stolda. Gazeta qayerda?', 'Газ+ета на п+олке, час+ы на стол+е. Где газ+ета?'), answer: 'shelf', other: 'table' },
  { id: 'p8', text: bt('Sumka karavot ustida, koʻzgu deraza yonida. Sumka qayerda?', 'С+умка на кроват+и, з+еркало у окн+а. Где с+умка?'), answer: 'bed', other: 'window' },
]

export interface YesNoDef {
  id: string
  q: BiTts
  yes: boolean
}

export const YESNO: YesNoDef[] = [
  { id: 'y1', q: bt('Suv ichiladimi?', 'Вод+у пьют?'), yes: true },
  { id: 'y2', q: bt('Non ichiladimi?', 'Хлеб пьют?'), yes: false },
  { id: 'y3', q: bt('Telefon bilan qoʻngʻiroq qilsa boʻladimi?', 'М+ожно позвон+ить по телеф+ону?'), yes: true },
  { id: 'y4', q: bt('Poyabzalni qoʻlga kiyamizmi?', '+Обувь надев+ают на р+уки?'), yes: false },
  { id: 'y5', q: bt('Shifokor bemorlarni davolaydimi?', 'Врач л+ечит больн+ых?'), yes: true },
  { id: 'y6', q: bt('Kema suvda suzadimi?', 'Кор+абль пл+авает по вод+е?'), yes: true },
  { id: 'y7', q: bt('Qor yozda yogʻadimi?', 'Снег ид+ёт л+етом?'), yes: false },
  { id: 'y8', q: bt('Soat vaqtni koʻrsatadimi?', 'Час+ы пок+азывают вр+емя?'), yes: true },
]

export interface CommandDef {
  id: string
  a: string
  b: string
  text: BiTts
}

const cmd = (id: string, a: string, b: string, uz: string, ruTts: string): CommandDef => ({ id, a, b, text: bt(uz, ruTts) })

export const COMMANDS: CommandDef[] = [
  cmd('c1', '$pen', 'key', 'Avval ruchkani, keyin kalitni koʻrsating.', 'Снач+ала покаж+ите р+учку, п+отом ключ.'),
  cmd('c2', 'phone', '$glasses', 'Avval telefonni, keyin koʻzoynakni koʻrsating.', 'Снач+ала покаж+ите телеф+он, п+отом очк+и.'),
  cmd('c3', 'spoon', 'cup', 'Avval qoshiqni, keyin piyolani koʻrsating.', 'Снач+ала покаж+ите л+ожку, п+отом пиал+у.'),
  cmd('c4', '$bread', '$apple', 'Avval nonni, keyin olmani koʻrsating.', 'Снач+ала покаж+ите хлеб, п+отом +яблоко.'),
  cmd('c5', '$medicine', '$water', 'Avval dorini, keyin suvni koʻrsating.', 'Снач+ала покаж+ите лек+арство, п+отом вод+у.'),
  cmd('c6', 'hammer', '$scissors', 'Avval bolgʻani, keyin qaychini koʻrsating.', 'Снач+ала покаж+ите молот+ок, п+отом н+ожницы.'),
  cmd('c7', 'door', 'window', 'Avval eshikni, keyin derazani koʻrsating.', 'Снач+ала покаж+ите дверь, п+отом окн+о.'),
  cmd('c8', 'key', 'phone', 'Avval kalitni, keyin telefonni koʻrsating.', 'Снач+ала покаж+ите ключ, п+отом телеф+он.'),
  cmd('c9', '$book', '$pen', 'Avval kitobni, keyin ruchkani koʻrsating.', 'Снач+ала покаж+ите кн+игу, п+отом р+учку.'),
  cmd('c10', '$shoes', '$socks', 'Avval tuflini, keyin paypoqni koʻrsating.', 'Снач+ала покаж+ите т+уфли, п+отом носк+и.'),
  cmd('c11', 'soap', 'toothbrush', 'Avval sovunni, keyin tish choʻtkasini koʻrsating.', 'Снач+ала покаж+ите м+ыло, п+отом зубн+ую щ+ётку.'),
  cmd('c12', '$bus', 'taxi', 'Avval avtobusni, keyin taksini koʻrsating.', 'Снач+ала покаж+ите авт+обус, п+отом такс+и.'),
]

// ---------------------------------------------------------------------------------------------------------------------
// Everyday situations

export interface SituationDef {
  id: string
  symbol: string
  ctx: BiTts
  good: BiTts
  /** Two phrases that are fine in other places but not here. */
  near: [BiTts, BiTts]
}

const sit = (id: string, symbol: string, ctx: BiTts, good: BiTts, n1: BiTts, n2: BiTts): SituationDef => ({ id, symbol, ctx, good, near: [n1, n2] })

export const SITUATIONS: SituationDef[] = [
  sit(
    'pharmacy', 'pill',
    bt('Siz dorixonadasiz. Boshingiz ogʻriyapti.', 'Вы в апт+еке. У вас бол+ит голов+а.'),
    bt('Bosh ogʻrigʻiga dori bering, iltimos.', 'Д+айте, пож+алуйста, лек+арство от головн+ой б+оли.'),
    bt('Menga ariza blankasi kerak.', 'Мне н+ужен бл+анк заявл+ения.'),
    bt('Bu yerdan avtobus bormi?', 'Здесь есть авт+обус?'),
  ),
  sit(
    'dose', 'pill',
    bt('Dorixonada dori oldingiz. Qanday ichishni bilmoqchisiz.', 'Вы покуп+аете лек+арство. Вам н+ужно узн+ать, как +его приним+ать.'),
    bt('Bu dorini kuniga necha marta ichaman?', 'Ск+олько раз в день приним+ать +это лек+арство?'),
    bt('Bu dori qayerda ishlab chiqarilgan?', 'Где произведен+о +это лек+арство?'),
    bt('Menga pochta konverti kerak.', 'Мне н+ужен почт+овый конв+ерт.'),
  ),
  sit(
    'busstop', 'bus_stop',
    bt('Siz bekatdasiz. Bankka borishingiz kerak.', 'Вы на остан+овке. Вам н+ужно в банк.'),
    bt('Bankka qaysi avtobus boradi?', 'Как+ой авт+обус +едет к б+анку?'),
    bt('Menga bir stakan suv bering.', 'Д+айте мне стак+ан вод+ы.'),
    bt('Dori narxi qancha?', 'Ск+олько ст+оит лек+арство?'),
  ),
  sit(
    'bank', 'bank',
    bt('Siz bankdasiz. Pensiyani olmoqchisiz.', 'Вы в б+анке. Вам н+ужно получ+ить п+енсию.'),
    bt('Pensiyamni olmoqchiman.', 'Я хоч+у получ+ить п+енсию.'),
    bt('Menga bitta non bering.', 'Д+айте мне хлеб.'),
    bt('Shifokorga yozilmoqchiman.', 'Я хоч+у запис+аться к врач+у.'),
  ),
  sit(
    'shop', 'convenience_store',
    bt('Siz doʻkondasiz. Sizga non kerak.', 'Вы в магаз+ине. Вам н+ужен хлеб.'),
    bt('Menga bitta non bering, iltimos.', 'Д+айте мне, пож+алуйста, хлеб.'),
    bt('Kartamdan pul yechmoqchiman.', 'Я хоч+у снять д+еньги с к+арты.'),
    bt('Bu yerda bekat bormi?', 'Здесь есть остан+овка?'),
  ),
  sit(
    'clinic', 'hospital',
    bt('Siz poliklinikadasiz. Shifokorga yozilishingiz kerak.', 'Вы в поликл+инике. Вам н+ужно запис+аться к врач+у.'),
    bt('Shifokor qabuliga yozilmoqchiman.', 'Я хоч+у запис+аться к врач+у.'),
    bt('Menga bitta non bering.', 'Д+айте мне хлеб.'),
    bt('Qaysi avtobus boradi?', 'Как+ой авт+обус +едет?'),
  ),
  sit(
    'doctor', 'stethoscope',
    bt('Siz shifokor qabulidasiz. Qorningiz ogʻriyapti.', 'Вы на при+ёме у врач+а. У вас бол+ит жив+от.'),
    bt('Qornim ikki kundan beri ogʻriyapti.', 'У мен+я два дня бол+ит жив+от.'),
    bt('Men dori sotib olmoqchiman.', 'Я хоч+у куп+ить лек+арство.'),
    bt('Pensiyamni olmoqchiman.', 'Я хоч+у получ+ить п+енсию.'),
  ),
  sit(
    'tea', 'teapot',
    bt('Siz choyxonadasiz. Choy ichmoqchisiz.', 'Вы в чайх+оне. Вы хот+ите в+ыпить ч+аю.'),
    bt('Menga bir choynak choy bering.', 'Принес+ите, пож+алуйста, ч+айник ч+аю.'),
    bt('Bu avtobus qayerga boradi?', 'Куд+а +едет +этот авт+обус?'),
    bt('Menga yangi dori kerak.', 'Мне н+ужно нов+ое лек+арство.'),
  ),
  sit(
    'call', 'mobile_phone',
    bt('Telefon jiringlayapti. Oilangizdan qoʻngʻiroq.', 'Звон+ит телеф+он. Звон+ят из в+ашей семь+и.'),
    bt('Allo, eshitaman. Qalaysiz?', 'Алл+о, я слуш+аю. Как у вас дел+а?'),
    bt('Pensiyamni olmoqchiman.', 'Я хоч+у получ+ить п+енсию.'),
    bt('Menga bitta non bering.', 'Д+айте мне хлеб.'),
  ),
  sit(
    'taxi', 'taxi',
    bt('Siz taksidasiz. Shifoxonaga borishingiz kerak.', 'Вы в такс+и. Вам н+ужно в больн+ицу.'),
    bt('Shifoxonaga olib boring, iltimos.', 'Отвез+ите мен+я в больн+ицу, пож+алуйста.'),
    bt('Bank qayerda joylashgan?', 'Где нах+одится банк?'),
    bt('Qaysi bekatda tushaman?', 'На как+ой остан+овке мне выход+ить?'),
  ),
  sit(
    'neighbour', 'houses',
    bt('Qoʻshningiz sizga salom berdi.', 'Сос+ед здор+овается с в+ами.'),
    bt('Assalomu alaykum, yaxshimisiz?', 'Здр+авствуйте, как в+аши дел+а?'),
    bt('Menga navbat raqami kerak.', 'Мне н+ужен н+омер +очереди.'),
    bt('Dorini qanday ichaman?', 'Как приним+ать лек+арство?'),
  ),
  sit(
    'post', 'envelope',
    bt('Siz pochtadasiz. Xat joʻnatmoqchisiz.', 'Вы на п+очте. Вам н+ужно отпр+авить письм+о.'),
    bt('Bu xatni joʻnatmoqchiman.', 'Я хоч+у отпр+авить +это письм+о.'),
    bt('Menga bitta non bering.', 'Д+айте мне хлеб.'),
    bt('Shifokorga yozilmoqchiman.', 'Я хоч+у запис+аться к врач+у.'),
  ),
  sit(
    'slow', 'ear',
    bt('Odam tez gapirdi, siz tushunmadingiz.', 'Собес+едник говор+ит б+ыстро, вы не успев+аете пон+ять.'),
    bt('Iltimos, sekinroq gapiring.', 'Говор+ите, пож+алуйста, м+едленнее.'),
    bt('Rahmat, hozir ketaman.', 'Спас+ибо, я сейч+ас уйд+у.'),
    bt('Xayr, ertagacha.', 'До свид+ания, до з+автра.'),
  ),
  sit(
    'rest', 'couch_and_lamp',
    bt('Siz charchadingiz. Suhbatni toʻxtatmoqchisiz.', 'Вам н+ужен +отдых. Вы хот+ите прерв+аться.'),
    bt('Men biroz dam olaman, keyin gaplashamiz.', 'Мне н+ужно отдохн+уть, п+отом поговор+им.'),
    bt('Menga yana choy bering.', 'Д+айте мне ещ+ё ч+ая.'),
    bt('Qaysi avtobus boradi?', 'Как+ой авт+обус +едет?'),
  ),
]

export const sitKey = (id: string, part: 'ctx' | 'good' | 'n1' | 'n2'): string => `g.ad.sit.${id}.${part}`

// ---------------------------------------------------------------------------------------------------------------------
// The list of everything these games speak (audio manifest + coverage tests)

export interface Spoken {
  key: string
  uz: string
  ru: string
  ruTts: string
}

const spokenOf = (key: string, b: BiTts): Spoken => ({ key, uz: b.uz, ru: b.ru, ruTts: b.ruTts })

export function adultSpoken(): Spoken[] {
  const out: Spoken[] = []
  const seen = new Set<string>()
  const push = (sp: Spoken) => {
    if (seen.has(sp.key)) return
    seen.add(sp.key)
    out.push({ ...sp, ru: plain(sp.ruTts) })
  }

  // Names of the game's own items.
  for (const [ref, d] of Object.entries(OWN)) push({ key: ownKey(ref), uz: d.uz, ru: plain(d.ruTts), ruTts: d.ruTts })
  // Naming cues: first syllable (spoken) and sentence frames.
  const frameIds = new Set<string>()
  for (const it of adultItems()) {
    if (hasSpokenCue(it)) {
      const uz = itemSyllables(it, 'uz')[0]
      const ru = itemSyllables(it, 'ru')[0]
      push({ key: cueKey(it), uz, ru, ruTts: ru })
    }
    const f = frameIdOf(it)
    if (f) frameIds.add(f)
  }
  for (const f of frameIds) push(spokenOf(frameKey(f), FRAMES[f]))
  // Category prompts and questions.
  for (const c of CATS) {
    push(spokenOf(`g.ad.c.${c.id}`, c.find))
    push(spokenOf(`g.ad.q.${c.id}`, c.q))
  }
  // Sentence builder (own sentences).
  for (const sent of SENTENCES) {
    const ruTts = sent.ru.join(' ')
    push({ key: sentenceKey(sent.id), uz: sent.uz.join(' '), ru: plain(ruTts), ruTts })
  }
  // Listening.
  for (const q of QA) push(spokenOf(`g.ad.l.${q.id}`, q.q))
  for (const q of PLACE_Q) push(spokenOf(`g.ad.l.${q.id}`, q.text))
  for (const q of YESNO) push(spokenOf(`g.ad.l.${q.id}`, q.q))
  for (const c of COMMANDS) push(spokenOf(`g.ad.l.${c.id}`, c.text))
  for (const l of Object.values(LOCS)) push(spokenOf(`g.ad.loc.${l.id}`, l.text))
  push({ key: 'g.ad.yes', uz: 'Ha', ru: 'Да', ruTts: 'Да' })
  push({ key: 'g.ad.no', uz: 'Yoʻq', ru: 'Нет', ruTts: 'Нет' })
  // Situations.
  for (const sd of SITUATIONS) {
    push(spokenOf(sitKey(sd.id, 'ctx'), sd.ctx))
    push(spokenOf(sitKey(sd.id, 'good'), sd.good))
    push(spokenOf(sitKey(sd.id, 'n1'), sd.near[0]))
    push(spokenOf(sitKey(sd.id, 'n2'), sd.near[1]))
  }
  return out
}

/** Hub/chooser picture of each category (a symbol every profile already has). */
export const CAT_SYMBOL: Record<CatId, string> = {
  food: 'shallow_pan_of_food',
  fruit: 'red_apple',
  veg: 'carrot',
  drinks: 'teacup_without_handle',
  clothes: 't_shirt',
  body: 'hand_with_fingers_splayed',
  animals: 'horse',
  transport: 'automobile',
  home: 'couch_and_lamp',
  kitchen: 'cooking',
  health: 'stethoscope',
  tools: 'hammer',
  tech: 'laptop',
  money: 'coin',
  stationery: 'pen',
  hygiene: 'soap',
  places: 'houses',
}
