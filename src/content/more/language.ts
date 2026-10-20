import type { Word } from '../types'
import { mk } from './kit'

/* Position words, question words, daily actions, and extensions of people, feelings, body and time. */

const ps = mk('position', 'misc')
export const POSITION: Word[] = [
  ps('in', 'ichida', 'внутри', 'внутр+и', 'pos_in'),
  ps('on', 'ustida', 'сверху', 'сверх+у', 'pos_on'),
  ps('under', 'ostida', 'под', 'под', 'pos_under'),
  ps('behind', 'orqasida', 'сзади', 'сз+ади', 'pos_behind'),
  ps('in_front', 'oldida', 'впереди', 'вперед+и', 'pos_front'),
  ps('next_to', 'yonida', 'рядом', 'р+ядом', 'pos_next'),
  ps('between', 'orasida', 'между', 'м+ежду', 'pos_between'),
  ps('outside', 'tashqarida', 'снаружи', 'снар+ужи', 'pos_out'),
  ps('left', 'chapda', 'слева', 'сл+ева', 'left_arrow'),
  ps('right', 'oʻngda', 'справа', 'спр+ава', 'right_arrow'),
  ps('near', 'yaqin', 'близко', 'бл+изко', 'pos_near'),
  ps('far', 'uzoq', 'далеко', 'далек+о', 'pos_far'),
  ps('middle', 'oʻrtada', 'посередине', 'посеред+ине', 'pos_middle'),
  ps('there', 'u yerda', 'там', 'там', 'backhand_index_pointing_right'),
]

const q = mk('questions', 'question')
export const QUESTIONS: Word[] = [
  q('q_when', 'qachon?', 'когда?', 'когд+а?', 'timer_clock'),
  q('q_why', 'nega?', 'почему?', 'почем+у?', 'thought_balloon'),
  q('q_how_are_you', 'qalaysan?', 'как дела?', 'как дел+а?', 'person_gesturing_ok'),
  q('q_how_many', 'nechta?', 'сколько?', 'ск+олько?', 'abacus'),
  q('q_which', 'qaysi?', 'какой?', 'как+ой?', 'backhand_index_pointing_down'),
  q('q_whose', 'kimniki?', 'чей?', 'чей?', 'name_badge'),
  q('q_where_to', 'qayoqqa?', 'куда?', 'куд+а?', 'compass'),
  q('q_where_from', 'qayerdan?', 'откуда?', 'откуд+а?', 'globe_with_meridians'),
  q('q_name', 'ismi nima?', 'как зовут?', 'как зов+ут?', 'speaking_head'),
  q('q_age', 'yoshing nechada?', 'сколько лет?', 'ск+олько лет?', 'birthday_cake'),
  q('q_what_happened', 'nima boʻldi?', 'что случилось?', 'что случ+илось?', 'exclamation_question_mark'),
  q('q_who_is_this', 'kim bu?', 'кто это?', 'кто +это?', 'busts_in_silhouette'),
  q('q_what_is_this', 'bu nima?', 'что это?', 'что +это?', 'face_with_raised_eyebrow'),
  q('q_how_much', 'qancha?', 'сколько стоит?', 'ск+олько ст+оит?', 'coin'),
]

/** Daily actions: Uzbek imperative ("sen" form) and Russian infinitive, like the base topic `actions`. */
const vb = mk('verbs', 'action')
export const VERBS: Word[] = [
  vb('clap', 'qarsak chal', 'хлопать', 'хл+опать', 'clapping_hands'),
  vb('wave', 'qoʻl silkit', 'махать', 'мах+ать', 'waving_hand'),
  vb('raise_hand', 'qoʻl koʻtar', 'поднять руку', 'подн+ять р+уку', 'man_raising_hand'),
  vb('climb', 'tirman', 'карабкаться', 'карабк+аться', 'person_climbing'),
  vb('write', 'yoz', 'писать', 'пис+ать', 'writing_hand'),
  vb('lift', 'koʻtar', 'поднять', 'подн+ять', 'person_lifting_weights'),
  vb('phone_call', 'qoʻngʻiroq qil', 'позвонить', 'позвон+ить', 'call_me_hand'),
  vb('sneeze', 'hapchi', 'чихать', 'чих+ать', 'sneezing_face'),
  vb('cough', 'yoʻtal', 'кашлять', 'к+ашлять', 'face_with_medical_mask'),
  vb('yawn', 'esna', 'зевать', 'зев+ать', 'yawning_face'),
  vb('laugh', 'kul', 'смеяться', 'сме+яться', 'rolling_on_the_floor_laughing'),
  vb('kiss', 'oʻp', 'целовать', 'целов+ать', 'kissing_face'),
  vb('search', 'qidir', 'искать', 'иск+ать', 'magnifying_glass_tilted_right'),
  vb('push', 'itar', 'толкать', 'толк+ать', 'rightwards_pushing_hand'),
  vb('take', 'ol', 'взять', 'взять', 'pinching_hand'),
  vb('ride_bike', 'velosiped hayda', 'ехать на велосипеде', 'ех+ать на велосип+еде', 'person_biking'),
  vb('row', 'eshkak es', 'грести', 'грест+и', 'person_rowing_boat'),
  vb('breathe', 'nafas ol', 'дышать', 'дыш+ать', 'face_exhaling'),
  vb('smile', 'tabassum qil', 'улыбаться', 'улыб+аться', 'smiling_face'),
]

/** Family & people (extension of topic `people`). Uncles and aunts share a generic adult picture: the label carries the meaning. */
const pe = mk('people', 'people')
export const PEOPLE_MORE: Word[] = [
  pe('boy', 'oʻgʻil bola', 'мальчик', 'м+альчик', 'boy'),
  pe('girl', 'qiz bola', 'девочка', 'д+евочка', 'girl'),
  pe('grown_up', 'katta odam', 'взрослый', 'взр+ослый', 'adult'),
  pe('uncle_mother', 'togʻa', 'дядя (брат мамы)', 'д+ядя, брат м+амы', 'man_white_hair'),
  pe('uncle_father', 'amaki', 'дядя (брат папы)', 'д+ядя, брат п+апы', 'man_beard'),
  pe('aunt_mother', 'xola', 'тётя (сестра мамы)', 'т+ётя, сестр+а м+амы', 'woman_blonde_hair'),
  pe('aunt_father', 'amma', 'тётя (сестра папы)', 'т+ётя, сестр+а п+апы', 'woman_white_hair'),
  pe('bride', 'kelin', 'невеста', 'нев+еста', 'person_with_veil'),
  pe('groom', 'kuyov', 'жених', 'жен+их', 'person_in_tuxedo'),
  pe('guest', 'mehmon', 'гость', 'гость', 'person_bowing'),
]

const fe = mk('feelings', 'describe')
export const FEELINGS_MORE: Word[] = [
  fe('proud', 'faxrlanaman', 'горжусь', 'горж+усь', 'star_struck'),
  fe('lonely', 'yolgʻizman', 'мне одиноко', 'мне один+око', 'pensive_face'),
  fe('joyful', 'quvondim', 'радостно', 'р+адостно', 'grinning_face_with_big_eyes'),
  fe('sick', 'kasalman', 'болею', 'бол+ею', 'woozy_face'),
  fe('dizzy', 'boshim aylanyapti', 'кружится голова', 'кр+ужится голов+а', 'dizzy'),
  fe('silly', 'shoʻxlik qilyapman', 'дурачусь', 'дурач+усь', 'zany_face', false, 'child'),
  fe('brave', 'jasurman', 'смело', 'см+ело', 'flexed_biceps'),
  fe('overloaded', 'juda koʻp', 'слишком много', 'сл+ишком мн+ого', 'exploding_head'),
  fe('curious', 'qiziqaman', 'интересно', 'интер+есно', 'face_with_monocle'),
  fe('sorry', 'kechir', 'прости', 'прост+и', 'person_bowing'),
  fe('disgusted', 'jirkanch', 'противно', 'прот+ивно', 'face_with_diagonal_mouth'),
]

const bo = mk('body', 'thing')
export const BODY_MORE: Word[] = [
  bo('neck', 'boʻyin', 'шея', 'ш+ея', 'part_neck', true),
  bo('shoulder', 'yelka', 'плечо', 'плеч+о', 'part_shoulder', true),
  bo('elbow', 'tirsak', 'локоть', 'л+окоть', 'part_elbow', true),
  bo('knee', 'tizza', 'колено', 'кол+ено', 'part_knee', true),
  bo('chest', 'koʻkrak', 'грудь', 'грудь', 'part_chest'),
  bo('back', 'orqa', 'спина', 'спин+а', 'part_back', true),
  bo('forehead', 'peshona', 'лоб', 'лоб', 'face_forehead', true),
  bo('eyebrow', 'qosh', 'бровь', 'бровь', 'face_eyebrow'),
  bo('cheek', 'yonoq', 'щека', 'щек+а', 'face_cheek', true),
  bo('chin', 'iyak', 'подбородок', 'подбор+одок', 'face_chin', true),
  bo('lips', 'lab', 'губы', 'г+убы', 'face_lips'),
  bo('lungs', 'oʻpka', 'лёгкие', 'л+ёгкие', 'lungs', true),
  bo('brain', 'miya', 'мозг', 'мозг', 'brain', true),
  bo('bone', 'suyak', 'кость', 'кость', 'bone', true),
  bo('foot', 'oyoq kafti', 'стопа', 'стоп+а', 'foot'),
  bo('fist', 'musht', 'кулак', 'кул+ак', 'raised_fist'),
  bo('nail', 'tirnoq', 'ноготь', 'н+оготь', 'nail_polish', true),
  bo('beard', 'soqol', 'борода', 'бород+а', 'person_beard', true),
]

const ti = mk('time', 'misc')
export const TIME_MORE: Word[] = [
  ti('week', 'hafta', 'неделя', 'нед+еля', 'calendar', true),
  ti('minute', 'daqiqa', 'минута', 'мин+ута', 'stopwatch', true),
]
