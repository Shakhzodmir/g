import type { Fitz, TopicId, Word } from './types'

/*
 * Gapimiz vocabulary v0.1.
 * - `uz` is canonical Uzbek Latin (1995): U+02BB in oʻ/gʻ, U+02BC for the tutuq belgisi.
 * - `ruTts` carries "+" before the stressed vowel of every word with 2+ syllables (and before ё).
 * - Core words never move: the 6×6 grid positions are permanent (motor planning).
 * - Inside a topic the order is the display order and must stay stable.
 * Must be reviewed by a native speaker and a speech therapist before the pilot (docs/content-review-v0.1.md).
 */

type Syl = [uz: string, ru: string]

function core(
  id: string,
  uz: string,
  ru: string,
  ruTts: string,
  fitz: Fitz,
  symbol: string,
  row: number,
  col: number,
  level: 1 | 2 | 3,
): Word {
  return { id, uz, ru, ruTts, fitz, symbol, topic: 'core', core: { row, col, level } }
}

function word(
  topic: TopicId,
  fitz: Fitz,
  id: string,
  uz: string,
  ru: string,
  ruTts: string,
  symbol: string,
  syl?: Syl,
): Word {
  const w: Word = { id, uz, ru, ruTts, fitz, symbol, topic }
  if (syl) w.syllables = { uz: syl[0], ru: syl[1] }
  return w
}

/*
 * Core grid (row, col), level in brackets:
 *        0              1               2             3              4              5
 * 0  men [1]       xohlayman [1]   yana [1]      bu [2]         qara [2]       nima? [3]
 * 1  ber [1]       yordam [1]      toʻxta [1]    boramiz [2]     oʻyna [2]      qayerda? [3]
 * 2  ha [1]        yoʻq [1]        tamom [1]     yoqadi [2]     yoqmaydi [2]   kim? [3]
 * 3  sen [2]       ye [2]          ich [2]       uxla [3]       kel [3]        qil [3]
 * 4  u [3]         och [3]         yop [3]       tepaga [3]     pastga [3]     shu yerda [3]
 * 5  yaxshi [3]    yomon [3]       katta [3]     kichik [3]     boshqa [3]     hozir [3]
 * Level 1 is the compact 3×3 block in the top-left corner; level 2 grows it to rows 0–3.
 */
const CORE: Word[] = [
  core('i', 'men', 'я', 'я', 'people', 'person_raising_hand', 0, 0, 1),
  core('want', 'xohlayman', 'хочу', 'хоч+у', 'action', 'palms_up_together', 0, 1, 1),
  core('more', 'yana', 'ещё', 'ещ+ё', 'misc', 'plus', 0, 2, 1),
  core('this', 'bu', 'это', '+это', 'misc', 'backhand_index_pointing_right', 0, 3, 2),
  core('look', 'qara', 'смотри', 'смотр+и', 'action', 'eyes', 0, 4, 2),
  core('what', 'nima?', 'что?', 'что?', 'question', 'white_question_mark', 0, 5, 3),

  core('give', 'ber', 'дай', 'дай', 'action', 'palm_up_hand', 1, 0, 1),
  core('help', 'yordam', 'помоги', 'помог+и', 'action', 'ring_buoy', 1, 1, 1),
  core('stop', 'toʻxta', 'стоп', 'стоп', 'action', 'raised_hand', 1, 2, 1),
  core('go', 'boramiz', 'пойдём', 'пойд+ём', 'action', 'person_walking_facing_right', 1, 3, 2),
  core('play', 'oʻyna', 'играть', 'игр+ать', 'action', 'person_bouncing_ball', 1, 4, 2),
  core('where', 'qayerda?', 'где?', 'где?', 'question', 'magnifying_glass_tilted_left', 1, 5, 3),

  core('yes', 'ha', 'да', 'да', 'social', 'thumbs_up', 2, 0, 1),
  core('no', 'yoʻq', 'нет', 'нет', 'negation', 'thumbs_down', 2, 1, 1),
  core('finished', 'tamom', 'всё', 'вс+ё', 'social', 'check_mark_button', 2, 2, 1),
  core('like', 'yoqadi', 'нравится', 'нр+авится', 'action', 'smiling_face_with_hearts', 2, 3, 2),
  core('dislike', 'yoqmaydi', 'не нравится', 'не нр+авится', 'negation', 'persevering_face', 2, 4, 2),
  core('who', 'kim?', 'кто?', 'кто?', 'question', 'thinking_face', 2, 5, 3),

  core('you', 'sen', 'ты', 'ты', 'people', 'index_pointing_at_the_viewer', 3, 0, 2),
  core('eat', 'ye', 'кушать', 'куш+ать', 'action', 'spoon', 3, 1, 2),
  core('drink', 'ich', 'пить', 'пить', 'action', 'cup_with_straw', 3, 2, 2),
  core('sleep', 'uxla', 'спать', 'спать', 'action', 'sleeping_face', 3, 3, 3),
  core('come', 'kel', 'иди сюда', 'ид+и сюд+а', 'action', 'person_walking', 3, 4, 3),
  core('do', 'qil', 'сделай', 'сд+елай', 'action', 'hammer_and_wrench', 3, 5, 3),

  core('he_she', 'u', 'он / она', 'он, он+а', 'people', 'person', 4, 0, 3),
  core('open', 'och', 'открой', 'откр+ой', 'action', 'open_file_folder', 4, 1, 3),
  core('close', 'yop', 'закрой', 'закр+ой', 'action', 'file_folder', 4, 2, 3),
  core('up', 'tepaga', 'вверх', 'вверх', 'misc', 'up_arrow', 4, 3, 3),
  core('down', 'pastga', 'вниз', 'вниз', 'misc', 'down_arrow', 4, 4, 3),
  core('here', 'shu yerda', 'здесь', 'здесь', 'misc', 'round_pushpin', 4, 5, 3),

  core('good', 'yaxshi', 'хорошо', 'хорош+о', 'describe', 'smiling_face_with_smiling_eyes', 5, 0, 3),
  core('bad', 'yomon', 'плохо', 'пл+охо', 'describe', 'disappointed_face', 5, 1, 3),
  core('big', 'katta', 'большой', 'больш+ой', 'describe', 'size_big', 5, 2, 3),
  core('small', 'kichik', 'маленький', 'м+аленький', 'describe', 'size_small', 5, 3, 3),
  core('different', 'boshqa', 'другое', 'друг+ое', 'describe', 'different', 5, 4, 3),
  core('now', 'hozir', 'сейчас', 'сейч+ас', 'misc', 'watch', 5, 5, 3),
]

const FOOD: Word[] = [
  word('food', 'thing', 'bread', 'non', 'лепёшка', 'леп+ёшка', 'non', ['non', 'ле-пё-шка']),
  word('food', 'thing', 'plov', 'palov', 'плов', 'плов', 'palov', ['pa-lov', 'плов']),
  word('food', 'thing', 'somsa', 'somsa', 'самса', 'самс+а', 'somsa', ['som-sa', 'сам-са']),
  word('food', 'thing', 'soup', 'shoʻrva', 'суп', 'суп', 'pot_of_food', ['shoʻr-va', 'суп']),
  word('food', 'thing', 'manti', 'manti', 'манты', 'мант+ы', 'dumpling', ['man-ti', 'ман-ты']),
  word('food', 'thing', 'lagman', 'lagʻmon', 'лагман', 'лагм+ан', 'spaghetti'),
  word('food', 'thing', 'rice', 'guruch', 'рис', 'рис', 'cooked_rice', ['gu-ruch', 'рис']),
  word('food', 'thing', 'meat', 'goʻsht', 'мясо', 'м+ясо', 'cut_of_meat'),
  word('food', 'thing', 'egg', 'tuxum', 'яйцо', 'яйц+о', 'egg', ['tu-xum', 'яй-цо']),
  word('food', 'thing', 'apple', 'olma', 'яблоко', '+яблоко', 'red_apple', ['ol-ma', 'я-бло-ко']),
  word('food', 'thing', 'banana', 'banan', 'банан', 'бан+ан', 'banana', ['ba-nan', 'ба-нан']),
  word('food', 'thing', 'grapes', 'uzum', 'виноград', 'виногр+ад', 'grapes', ['u-zum', 'ви-но-град']),
  word('food', 'thing', 'pomegranate', 'anor', 'гранат', 'гран+ат', 'anor', ['a-nor', 'гра-нат']),
  word('food', 'thing', 'peach', 'shaftoli', 'персик', 'п+ерсик', 'peach', ['shaf-to-li', 'пер-сик']),
  word('food', 'thing', 'melon', 'qovun', 'дыня', 'д+ыня', 'melon', ['qo-vun', 'ды-ня']),
  word('food', 'thing', 'watermelon', 'tarvuz', 'арбуз', 'арб+уз', 'watermelon', ['tar-vuz', 'ар-буз']),
  word('food', 'thing', 'carrot', 'sabzi', 'морковь', 'морк+овь', 'carrot', ['sab-zi', 'мор-ковь']),
  word('food', 'thing', 'potato', 'kartoshka', 'картошка', 'карт+ошка', 'potato', ['kar-tosh-ka', 'кар-то-шка']),
  word('food', 'thing', 'tomato', 'pomidor', 'помидор', 'помид+ор', 'tomato', ['po-mi-dor', 'по-ми-дор']),
  word('food', 'thing', 'cucumber', 'bodring', 'огурец', 'огур+ец', 'cucumber', ['bod-ring', 'о-гу-рец']),
  word('food', 'thing', 'sweets', 'shirinlik', 'сладкое', 'сл+адкое', 'candy'),
  word('food', 'thing', 'ice_cream', 'muzqaymoq', 'мороженое', 'мор+оженое', 'soft_ice_cream', ['muz-qay-moq', 'мо-ро-же-но-е']),
]

const DRINKS: Word[] = [
  word('drinks', 'thing', 'water', 'suv', 'вода', 'вод+а', 'droplet', ['suv', 'во-да']),
  word('drinks', 'thing', 'tea', 'choy', 'чай', 'чай', 'teacup_without_handle', ['choy', 'чай']),
  word('drinks', 'thing', 'milk', 'sut', 'молоко', 'молок+о', 'glass_of_milk', ['sut', 'мо-ло-ко']),
  word('drinks', 'thing', 'juice', 'sharbat', 'сок', 'сок', 'beverage_box', ['shar-bat', 'сок']),
  word('drinks', 'thing', 'compote', 'kompot', 'компот', 'комп+от', 'jar', ['kom-pot', 'ком-пот']),
  word('drinks', 'thing', 'cocoa', 'kakao', 'какао', 'кака+о', 'hot_beverage', ['ka-ka-o', 'ка-ка-о']),
  word('drinks', 'thing', 'katyk', 'qatiq', 'катык', 'кат+ык', 'bowl_with_spoon', ['qa-tiq', 'ка-тык']),
  word('drinks', 'thing', 'lemonade', 'limonad', 'лимонад', 'лимон+ад', 'lemon'),
  word('drinks', 'thing', 'teapot', 'choynak', 'чайник', 'ч+айник', 'teapot', ['choy-nak', 'чай-ник']),
  word('drinks', 'thing', 'glass', 'stakan', 'стакан', 'стак+ан', 'tumbler_glass'),
  word('drinks', 'describe', 'thirsty', 'chanqadim', 'хочу пить', 'хоч+у пить', 'potable_water'),
  word('drinks', 'action', 'spilled', 'toʻkildi', 'пролилось', 'пролил+ось', 'pouring_liquid'),
  word('drinks', 'describe', 'hot_drink', 'issiq', 'горячее', 'гор+ячее', 'steaming_bowl'),
  word('drinks', 'describe', 'cold_drink', 'sovuq', 'холодное', 'хол+одное', 'ice'),
]

const PEOPLE: Word[] = [
  word('people', 'people', 'mother', 'ona', 'мама', 'м+ама', 'woman', ['o-na', 'ма-ма']),
  word('people', 'people', 'father', 'ota', 'папа', 'п+апа', 'man', ['o-ta', 'па-па']),
  word('people', 'people', 'grandma', 'buvi', 'бабушка', 'б+абушка', 'old_woman', ['bu-vi', 'ба-бу-шка']),
  word('people', 'people', 'grandpa', 'bobo', 'дедушка', 'д+едушка', 'old_man', ['bo-bo', 'де-ду-шка']),
  word('people', 'people', 'older_brother', 'aka', 'старший брат', 'ст+арший брат', 'man_curly_hair'),
  word('people', 'people', 'older_sister', 'opa', 'старшая сестра', 'ст+аршая сестр+а', 'woman_curly_hair'),
  word('people', 'people', 'younger_brother', 'uka', 'младший брат', 'мл+адший брат', 'boy'),
  word('people', 'people', 'younger_sister', 'singil', 'младшая сестра', 'мл+адшая сестр+а', 'girl'),
  word('people', 'people', 'child', 'bola', 'ребёнок', 'реб+ёнок', 'child', ['bo-la', 'ре-бё-нок']),
  word('people', 'people', 'baby', 'chaqaloq', 'малыш', 'мал+ыш', 'baby', ['cha-qa-loq', 'ма-лыш']),
  word('people', 'people', 'kg_teacher', 'tarbiyachi', 'воспитатель', 'воспит+атель', 'woman_feeding_baby'),
  word('people', 'people', 'teacher', 'oʻqituvchi', 'учитель', 'уч+итель', 'man_teacher'),
  word('people', 'people', 'speech_therapist', 'logoped', 'логопед', 'логоп+ед', 'left_speech_bubble', ['lo-go-ped', 'ло-го-пед']),
  word('people', 'people', 'doctor', 'shifokor', 'врач', 'врач', 'health_worker', ['shi-fo-kor', 'врач']),
  word('people', 'people', 'nurse', 'hamshira', 'медсестра', 'медсестр+а', 'woman_health_worker'),
  word('people', 'people', 'friend', 'doʻst', 'друг', 'друг', 'handshake'),
  word('people', 'people', 'neighbour', 'qoʻshni', 'сосед', 'сос+ед', 'houses'),
  word('people', 'people', 'mother_oyi', 'oyi', 'мамочка', 'м+амочка', 'woman', ['o-yi', 'ма-мо-чка']),
  word('people', 'people', 'father_dada', 'dada', 'папочка', 'п+апочка', 'man', ['da-da', 'па-по-чка']),
]

const FEELINGS: Word[] = [
  word('feelings', 'describe', 'happy', 'xursand', 'весело', 'в+есело', 'beaming_face_with_smiling_eyes'),
  word('feelings', 'describe', 'calm', 'tinch', 'спокойно', 'спок+ойно', 'relieved_face'),
  word('feelings', 'describe', 'sad', 'xafa', 'грустно', 'гр+устно', 'frowning_face'),
  word('feelings', 'describe', 'angry', 'jahlim chiqdi', 'злюсь', 'злюсь', 'face_with_steam_from_nose'),
  word('feelings', 'describe', 'scared', 'qoʻrqdim', 'страшно', 'стр+ашно', 'fearful_face'),
  word('feelings', 'describe', 'worried', 'xavotirdaman', 'волнуюсь', 'волн+уюсь', 'anxious_face_with_sweat'),
  word('feelings', 'describe', 'tired', 'charchadim', 'устаю', 'уста+ю', 'sleepy_face'),
  word('feelings', 'describe', 'hungry', 'qornim och', 'хочу есть', 'хоч+у есть', 'face_savoring_food'),
  word('feelings', 'describe', 'hurts', 'ogʻriyapti', 'больно', 'б+ольно', 'face_with_head_bandage'),
  word('feelings', 'describe', 'surprised', 'hayron', 'удивительно', 'удив+ительно', 'astonished_face'),
  word('feelings', 'describe', 'bored', 'zerikdim', 'скучно', 'ск+учно', 'unamused_face'),
  word('feelings', 'describe', 'noisy', 'shovqin', 'шумно', 'ш+умно', 'speaker_high_volume'),
  word('feelings', 'describe', 'cold', 'sovqotdim', 'холодно', 'х+олодно', 'snowflake'),
  word('feelings', 'describe', 'hot', 'isib ketdim', 'жарко', 'ж+арко', 'hot_face'),
  word('feelings', 'describe', 'crying', 'yigʻlayapman', 'плачу', 'пл+ачу', 'crying_face'),
  word('feelings', 'describe', 'funny', 'kulgili', 'смешно', 'смешн+о', 'grinning_squinting_face'),
  word('feelings', 'describe', 'shy', 'uyalyapman', 'стесняюсь', 'стесн+яюсь', 'face_with_peeking_eye'),
  word('feelings', 'describe', 'love', 'yaxshi koʻraman', 'люблю', 'любл+ю', 'smiling_face_with_hearts'),
]

const BODY: Word[] = [
  word('body', 'thing', 'head', 'bosh', 'голова', 'голов+а', 'person_bald', ['bosh', 'го-ло-ва']),
  word('body', 'thing', 'eye', 'koʻz', 'глаз', 'глаз', 'eye'),
  word('body', 'thing', 'ear', 'quloq', 'ухо', '+ухо', 'ear', ['qu-loq', 'у-хо']),
  word('body', 'thing', 'nose', 'burun', 'нос', 'нос', 'nose', ['bu-run', 'нос']),
  word('body', 'thing', 'mouth', 'ogʻiz', 'рот', 'рот', 'mouth', ['o-gʻiz', 'рот']),
  word('body', 'thing', 'teeth', 'tish', 'зуб', 'зуб', 'tooth', ['tish', 'зуб']),
  word('body', 'thing', 'tongue', 'til', 'язык', 'яз+ык', 'tongue', ['til', 'я-зык']),
  word('body', 'thing', 'hand', 'qoʻl', 'рука', 'рук+а', 'hand_with_fingers_splayed', ['qoʻl', 'ру-ка']),
  word('body', 'thing', 'finger', 'barmoq', 'палец', 'п+алец', 'index_pointing_up', ['bar-moq', 'па-лец']),
  word('body', 'thing', 'leg', 'oyoq', 'нога', 'ног+а', 'leg', ['o-yoq', 'но-га']),
  word('body', 'thing', 'tummy', 'qorin', 'живот', 'жив+от', 'qorin', ['qo-rin', 'жи-вот']),
  word('body', 'thing', 'hair', 'soch', 'волосы', 'в+олосы', 'person_curly_hair', ['soch', 'во-ло-сы']),
  word('body', 'thing', 'plaster', 'plastir', 'пластырь', 'пл+астырь', 'adhesive_bandage'),
  word('body', 'thing', 'fever', 'isitma', 'температура', 'температ+ура', 'face_with_thermometer', ['i-sit-ma', 'тем-пе-ра-ту-ра']),
  word('body', 'thing', 'medicine', 'dori', 'лекарство', 'лек+арство', 'pill', ['do-ri', 'ле-кар-ство']),
  word('body', 'describe', 'nausea', 'koʻnglim aynayapti', 'тошнит', 'тошн+ит', 'nauseated_face'),
]

const TOYS: Word[] = [
  word('toys', 'thing', 'ball', 'toʻp', 'мяч', 'мяч', 'soccer_ball', ['toʻp', 'мяч']),
  word('toys', 'thing', 'doll', 'qoʻgʻirchoq', 'кукла', 'к+укла', 'doll', ['qoʻ-gʻir-choq', 'ку-кла']),
  word('toys', 'thing', 'teddy', 'ayiqcha', 'мишка', 'м+ишка', 'teddy_bear', ['a-yiq-cha', 'ми-шка']),
  word('toys', 'thing', 'blocks', 'kubiklar', 'кубики', 'к+убики', 'blocks', ['ku-bik-lar', 'ку-би-ки']),
  word('toys', 'thing', 'puzzle', 'pazl', 'пазл', 'пазл', 'puzzle_piece'),
  word('toys', 'thing', 'car', 'mashina', 'машина', 'маш+ина', 'automobile', ['ma-shi-na', 'ма-ши-на']),
  word('toys', 'thing', 'train', 'poyezd', 'поезд', 'п+оезд', 'locomotive', ['po-yezd', 'по-езд']),
  word('toys', 'thing', 'airplane', 'samolyot', 'самолёт', 'самол+ёт', 'airplane', ['sa-mol-yot', 'са-мо-лёт']),
  word('toys', 'thing', 'helicopter', 'vertolyot', 'вертолёт', 'вертол+ёт', 'helicopter', ['ver-tol-yot', 'вер-то-лёт']),
  word('toys', 'thing', 'bicycle', 'velosiped', 'велосипед', 'велосип+ед', 'bicycle', ['ve-lo-si-ped', 'ве-ло-си-пед']),
  word('toys', 'thing', 'bus', 'avtobus', 'автобус', 'авт+обус', 'bus', ['av-to-bus', 'а-вто-бус']),
  word('toys', 'thing', 'ambulance', 'tez yordam', 'скорая помощь', 'ск+орая п+омощь', 'ambulance'),
  word('toys', 'thing', 'balloon', 'shar', 'шарик', 'ш+арик', 'balloon', ['shar', 'ша-рик']),
  word('toys', 'thing', 'bubbles', 'pufak', 'пузыри', 'пузыр+и', 'bubbles', ['pu-fak', 'пу-зы-ри']),
  word('toys', 'thing', 'drum', 'baraban', 'барабан', 'бараб+ан', 'drum', ['ba-ra-ban', 'ба-ра-бан']),
  word('toys', 'thing', 'kite', 'varrak', 'воздушный змей', 'возд+ушный змей', 'kite'),
  word('toys', 'thing', 'slide', 'sirgʻanchiq', 'горка', 'г+орка', 'playground_slide', ['sir-gʻan-chiq', 'гор-ка']),
  word('toys', 'thing', 'cartoon', 'multfilm', 'мультик', 'м+ультик', 'television', ['mult-film', 'муль-тик']),
  word('toys', 'thing', 'music', 'musiqa', 'музыка', 'м+узыка', 'musical_notes', ['mu-si-qa', 'му-зы-ка']),
  word('toys', 'thing', 'hide_and_seek', 'berkinmachoq', 'прятки', 'пр+ятки', 'see_no_evil_monkey', ['ber-kin-ma-choq', 'пря-тки']),
]

const PLACES: Word[] = [
  word('places', 'thing', 'home', 'uy', 'дом', 'дом', 'house', ['uy', 'дом']),
  word('places', 'thing', 'yard', 'hovli', 'двор', 'двор', 'house_with_garden', ['hov-li', 'двор']),
  word('places', 'thing', 'kitchen', 'oshxona', 'кухня', 'к+ухня', 'cooking', ['osh-xo-na', 'ку-хня']),
  word('places', 'thing', 'bedroom', 'yotoqxona', 'спальня', 'сп+альня', 'bed', ['yo-toq-xo-na', 'спа-льня']),
  word('places', 'thing', 'toilet', 'hojatxona', 'туалет', 'туал+ет', 'toilet', ['ho-jat-xo-na', 'ту-а-лет']),
  word('places', 'thing', 'bathroom', 'vannaxona', 'ванная', 'в+анная', 'bathtub'),
  word('places', 'thing', 'kindergarten', 'bogʻcha', 'садик', 'с+адик', 'playground_slide', ['bogʻ-cha', 'са-дик']),
  word('places', 'thing', 'school', 'maktab', 'школа', 'шк+ола', 'school', ['mak-tab', 'шко-ла']),
  word('places', 'thing', 'park', 'park', 'парк', 'парк', 'national_park', ['park', 'парк']),
  word('places', 'thing', 'garden', 'bogʻ', 'сад', 'сад', 'deciduous_tree'),
  word('places', 'thing', 'shop', 'doʻkon', 'магазин', 'магаз+ин', 'convenience_store', ['doʻ-kon', 'ма-га-зин']),
  word('places', 'thing', 'bazaar', 'bozor', 'базар', 'баз+ар', 'basket', ['bo-zor', 'ба-зар']),
  word('places', 'thing', 'hospital', 'shifoxona', 'больница', 'больн+ица', 'hospital', ['shi-fo-xo-na', 'бо-льни-ца']),
  word('places', 'thing', 'barbershop', 'sartaroshxona', 'парикмахерская', 'парикм+ахерская', 'barber_pole'),
  word('places', 'thing', 'pool', 'basseyn', 'бассейн', 'басс+ейн', 'person_swimming'),
]

const CLOTHES: Word[] = [
  word('clothes', 'thing', 'tshirt', 'futbolka', 'футболка', 'футб+олка', 't_shirt'),
  word('clothes', 'thing', 'dress', 'koʻylak', 'платье', 'пл+атье', 'dress', ['koʻy-lak', 'пла-тье']),
  word('clothes', 'thing', 'trousers', 'shim', 'штаны', 'штан+ы', 'jeans', ['shim', 'шта-ны']),
  word('clothes', 'thing', 'shorts', 'kalta shim', 'шорты', 'ш+орты', 'shorts'),
  word('clothes', 'thing', 'jacket', 'kurtka', 'куртка', 'к+уртка', 'coat', ['kurt-ka', 'кур-тка']),
  word('clothes', 'thing', 'socks', 'paypoq', 'носки', 'носк+и', 'socks', ['pay-poq', 'но-ски']),
  word('clothes', 'thing', 'sneakers', 'krossovka', 'кроссовки', 'кросс+овки', 'running_shoe'),
  word('clothes', 'thing', 'shoes', 'tufli', 'туфли', 'т+уфли', 'mans_shoe', ['tuf-li', 'ту-фли']),
  word('clothes', 'thing', 'boots', 'etik', 'сапоги', 'сапог+и', 'womans_boot', ['e-tik', 'са-по-ги']),
  word('clothes', 'thing', 'slippers', 'shippak', 'тапочки', 'т+апочки', 'flat_shoe', ['ship-pak', 'та-по-чки']),
  word('clothes', 'thing', 'gloves', 'qoʻlqop', 'перчатки', 'перч+атки', 'gloves', ['qoʻl-qop', 'пер-ча-тки']),
  word('clothes', 'thing', 'scarf', 'sharf', 'шарф', 'шарф', 'scarf'),
  word('clothes', 'thing', 'cap', 'kepka', 'кепка', 'к+епка', 'billed_cap', ['kep-ka', 'ке-пка']),
  word('clothes', 'thing', 'doppi', 'doʻppi', 'тюбетейка', 'тюбет+ейка', 'doppi', ['doʻp-pi', 'тю-бе-тей-ка']),
  word('clothes', 'thing', 'glasses', 'koʻzoynak', 'очки', 'очк+и', 'glasses', ['koʻz-oy-nak', 'о-чки']),
]

const ACTIONS: Word[] = [
  word('actions', 'action', 'run', 'yugur', 'бегать', 'б+егать', 'person_running'),
  word('actions', 'action', 'jump', 'sakra', 'прыгать', 'пр+ыгать', 'person_cartwheeling'),
  word('actions', 'action', 'sit', 'oʻtir', 'сидеть', 'сид+еть', 'seat'),
  word('actions', 'action', 'stand_up', 'tur', 'встать', 'встать', 'person_standing'),
  word('actions', 'action', 'wash', 'yuv', 'мыть', 'мыть', 'sponge'),
  word('actions', 'action', 'draw', 'rasm chiz', 'рисовать', 'рисов+ать', 'crayon'),
  word('actions', 'action', 'read', 'oʻqi', 'читать', 'чит+ать', 'books'),
  word('actions', 'action', 'sing', 'kuyla', 'петь', 'петь', 'microphone'),
  word('actions', 'action', 'dance', 'raqsga tush', 'танцевать', 'танцев+ать', 'man_dancing'),
  word('actions', 'action', 'hug', 'quchoqla', 'обнять', 'обн+ять', 'people_hugging'),
  word('actions', 'action', 'wait', 'kut', 'ждать', 'ждать', 'hourglass_not_done'),
  word('actions', 'action', 'swim', 'suz', 'плавать', 'пл+авать', 'person_swimming'),
  word('actions', 'action', 'blow', 'pufla', 'дуть', 'дуть', 'wind_face'),
  word('actions', 'action', 'listen', 'tingla', 'слушать', 'сл+ушать', 'speaker_medium_volume'),
  word('actions', 'action', 'tidy_up', 'yigʻishtir', 'убирать', 'убир+ать', 'broom'),
  word('actions', 'action', 'show', 'koʻrsat', 'показать', 'показ+ать', 'backhand_index_pointing_up'),
  word('actions', 'action', 'talk', 'gapir', 'говорить', 'говор+ить', 'grinning_face'),
]

const ANIMALS: Word[] = [
  word('animals', 'thing', 'cat', 'mushuk', 'кошка', 'к+ошка', 'cat', ['mu-shuk', 'ко-шка']),
  word('animals', 'thing', 'dog', 'it', 'собака', 'соб+ака', 'dog', ['it', 'со-ба-ка']),
  word('animals', 'thing', 'cow', 'sigir', 'корова', 'кор+ова', 'cow', ['si-gir', 'ко-ро-ва']),
  word('animals', 'thing', 'sheep', 'qoʻy', 'овечка', 'ов+ечка', 'ewe', ['qoʻy', 'о-ве-чка']),
  word('animals', 'thing', 'goat', 'echki', 'коза', 'коз+а', 'goat', ['ech-ki', 'ко-за']),
  word('animals', 'thing', 'horse', 'ot', 'лошадка', 'лош+адка', 'horse', ['ot', 'ло-ша-дка']),
  word('animals', 'thing', 'donkey', 'eshak', 'ослик', '+ослик', 'donkey', ['e-shak', 'о-слик']),
  word('animals', 'thing', 'camel', 'tuya', 'верблюд', 'вербл+юд', 'two_hump_camel', ['tu-ya', 'вер-блюд']),
  word('animals', 'thing', 'chicken', 'tovuq', 'курица', 'к+урица', 'chicken', ['to-vuq', 'ку-ри-ца']),
  word('animals', 'thing', 'rooster', 'xoʻroz', 'петух', 'пет+ух', 'rooster', ['xoʻ-roz', 'пе-тух']),
  word('animals', 'thing', 'duck', 'oʻrdak', 'утка', '+утка', 'duck', ['oʻr-dak', 'у-тка']),
  word('animals', 'thing', 'bird', 'qush', 'птичка', 'пт+ичка', 'bird', ['qush', 'пти-чка']),
  word('animals', 'thing', 'dove', 'musicha', 'горлица', 'г+орлица', 'dove', ['mu-si-cha', 'гор-ли-ца']),
  word('animals', 'thing', 'owl', 'boyqush', 'сова', 'сов+а', 'owl', ['boy-qush', 'со-ва']),
  word('animals', 'thing', 'fish', 'baliq', 'рыбка', 'р+ыбка', 'tropical_fish', ['ba-liq', 'ры-бка']),
  word('animals', 'thing', 'rabbit', 'quyon', 'зайчик', 'з+айчик', 'rabbit', ['qu-yon', 'зай-чик']),
  word('animals', 'thing', 'frog', 'qurbaqa', 'лягушка', 'ляг+ушка', 'frog', ['qur-ba-qa', 'ля-гу-шка']),
  word('animals', 'thing', 'mouse', 'sichqon', 'мышка', 'м+ышка', 'mouse', ['sich-qon', 'мы-шка']),
  word('animals', 'thing', 'bee', 'ari', 'пчела', 'пчел+а', 'honeybee', ['a-ri', 'пче-ла']),
  word('animals', 'thing', 'butterfly', 'kapalak', 'бабочка', 'б+абочка', 'butterfly', ['ka-pa-lak', 'ба-бо-чка']),
  word('animals', 'thing', 'turtle', 'toshbaqa', 'черепаха', 'череп+аха', 'turtle', ['tosh-ba-qa', 'че-ре-па-ха']),
  word('animals', 'thing', 'elephant', 'fil', 'слон', 'слон', 'elephant', ['fil', 'слон']),
  word('animals', 'thing', 'lion', 'sher', 'лев', 'лев', 'lion', ['sher', 'лев']),
  word('animals', 'thing', 'monkey', 'maymun', 'обезьяна', 'обезь+яна', 'monkey', ['may-mun', 'о-бе-зья-на']),
]

const SCHOOL: Word[] = [
  word('school', 'thing', 'book', 'kitob', 'книга', 'кн+ига', 'blue_book', ['ki-tob', 'кни-га']),
  word('school', 'thing', 'pencil', 'qalam', 'карандаш', 'каранд+аш', 'pencil', ['qa-lam', 'ка-ран-даш']),
  word('school', 'thing', 'pen', 'ruchka', 'ручка', 'р+учка', 'pen', ['ruch-ka', 'ру-чка']),
  word('school', 'thing', 'notebook', 'daftar', 'тетрадь', 'тетр+адь', 'notebook', ['daf-tar', 'те-традь']),
  word('school', 'thing', 'scissors', 'qaychi', 'ножницы', 'н+ожницы', 'scissors', ['qay-chi', 'но-жни-цы']),
  word('school', 'thing', 'paints', 'boʻyoq', 'краски', 'кр+аски', 'artist_palette', ['boʻ-yoq', 'кра-ски']),
  word('school', 'thing', 'picture', 'rasm', 'рисунок', 'рис+унок', 'framed_picture'),
  word('school', 'thing', 'backpack', 'ryukzak', 'рюкзак', 'рюкз+ак', 'backpack'),
  word('school', 'thing', 'chair', 'stul', 'стул', 'стул', 'chair'),
  word('school', 'thing', 'computer', 'kompyuter', 'компьютер', 'компь+ютер', 'laptop'),
  word('school', 'thing', 'letters', 'harflar', 'буквы', 'б+уквы', 'input_latin_uppercase', ['harf-lar', 'бу-квы']),
  word('school', 'thing', 'numbers', 'raqamlar', 'цифры', 'ц+ифры', 'input_numbers', ['ra-qam-lar', 'ци-фры']),
  word('school', 'thing', 'lesson', 'mashgʻulot', 'занятие', 'зан+ятие', 'abacus'),
  word('school', 'thing', 'break', 'tanaffus', 'перерыв', 'перер+ыв', 'couch_and_lamp'),
  word('school', 'thing', 'turn', 'navbat', 'очередь', '+очередь', 'ticket'),
]

/* Time, weather and the daily-routine activities used by visual schedules. */
const TIME: Word[] = [
  word('time', 'misc', 'morning', 'ertalab', 'утро', '+утро', 'sunrise'),
  word('time', 'misc', 'evening', 'kechqurun', 'вечер', 'в+ечер', 'sunset'),
  word('time', 'misc', 'today', 'bugun', 'сегодня', 'сег+одня', 'spiral_calendar'),
  word('time', 'misc', 'first', 'avval', 'сначала', 'снач+ала', 'keycap_1'),
  word('time', 'misc', 'then', 'keyin', 'потом', 'пот+ом', 'right_arrow'),
  word('time', 'action', 'wake_up', 'uygʻonish', 'проснуться', 'просн+уться', 'sun_with_face'),
  word('time', 'action', 'wash_face', 'yuvinish', 'умыться', 'ум+ыться', 'soap'),
  word('time', 'action', 'brush_teeth', 'tish yuvish', 'почистить зубы', 'поч+истить з+убы', 'toothbrush'),
  word('time', 'action', 'get_dressed', 'kiyinish', 'одеться', 'од+еться', 'womans_clothes'),
  word('time', 'action', 'breakfast', 'nonushta', 'завтрак', 'з+автрак', 'non'),
  word('time', 'action', 'go_kindergarten', 'bogʻchaga borish', 'в садик', 'в с+адик', 'playground_slide'),
  word('time', 'action', 'play_time', 'oʻyin', 'игра', 'игр+а', 'yo_yo'),
  word('time', 'action', 'walk', 'sayr', 'прогулка', 'прог+улка', 'footprints'),
  word('time', 'action', 'lunch', 'tushlik', 'обед', 'об+ед', 'fork_and_knife'),
  word('time', 'action', 'nap', 'kunduzgi uyqu', 'тихий час', 'т+ихий час', 'zzz'),
  word('time', 'action', 'dinner', 'kechki ovqat', 'ужин', '+ужин', 'fork_and_knife_with_plate'),
  word('time', 'action', 'bath', 'choʻmilish', 'купание', 'куп+ание', 'person_taking_bath'),
  word('time', 'action', 'story_time', 'ertak', 'сказка', 'ск+азка', 'open_book'),
  word('time', 'action', 'bedtime', 'uyqu', 'сон', 'сон', 'person_in_bed'),
  word('time', 'action', 'go_home', 'uyga ketish', 'домой', 'дом+ой', 'house'),
  word('time', 'thing', 'sun', 'quyosh', 'солнце', 'с+олнце', 'sun', ['qu-yosh', 'со-лнце']),
  word('time', 'thing', 'rain', 'yomgʻir', 'дождь', 'дождь', 'cloud_with_rain', ['yom-gʻir', 'дождь']),
  word('time', 'thing', 'snow', 'qor', 'снег', 'снег', 'cloud_with_snow'),
  word('time', 'thing', 'wind', 'shamol', 'ветер', 'в+етер', 'leaf_fluttering_in_wind', ['sha-mol', 'ве-тер']),
]

export const WORDS: Word[] = [
  ...CORE,
  ...FOOD,
  ...DRINKS,
  ...PEOPLE,
  ...FEELINGS,
  ...BODY,
  ...TOYS,
  ...PLACES,
  ...CLOTHES,
  ...ACTIONS,
  ...ANIMALS,
  ...SCHOOL,
  ...TIME,
]

const BY_ID = new Map(WORDS.map((w) => [w.id, w]))

/** Words of one topic in their fixed display order. */
export function wordsByTopic(t: TopicId): Word[] {
  return WORDS.filter((w) => w.topic === t)
}

export function wordById(id: string): Word | undefined {
  return BY_ID.get(id)
}
