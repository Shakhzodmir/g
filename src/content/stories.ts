import type { Bi } from '../i18n/types'

export interface StoryPage extends Bi {
  symbol: string
  ruTts: string
}

export interface SocialStory {
  id: string
  title: Bi
  symbol: string
  pages: StoryPage[]
}

function pg(symbol: string, uz: string, ru: string, ruTts: string): StoryPage {
  return { symbol, uz, ru, ruTts }
}

/*
 * Social stories in the style of Carol Gray: first person, present tense, calm and literal.
 * Mostly descriptive and perspective sentences; about one coaching sentence ("I can…",
 * "I try…") per five. No promises that cannot be kept ("it will not hurt" is avoided at the doctor).
 */
export const STORIES: SocialStory[] = [
  {
    id: 'doctor',
    title: { uz: 'Shifokorga boramiz', ru: 'Идём к врачу' },
    symbol: 'health_worker',
    pages: [
      pg('hospital', 'Bugun men shifokorga boraman.', 'Сегодня я иду к врачу.', 'Сег+одня я ид+у к врач+у.'),
      pg('woman', 'Onam men bilan boradi.', 'Мама идёт со мной.', 'М+ама ид+ёт со мн+ой.'),
      pg('hourglass_not_done', 'Biz navbatda kutamiz. Kutayotganda oʻyinchoq bilan oʻynashim mumkin.', 'Мы ждём своей очереди. Пока ждём, я могу играть с игрушкой.', 'Мы ждём сво+ей +очереди. Пок+а ждём, я мог+у игр+ать с игр+ушкой.'),
      pg('lab_coat', 'Shifokor oq xalat kiygan. U bolalarga yordam beradi.', 'Врач в белом халате. Он помогает детям.', 'Врач в б+елом хал+ате. Он помог+ает д+етям.'),
      pg('ear', 'Shifokor quloqlarimga va tomogʻimga qaraydi.', 'Врач смотрит мои уши и горло.', 'Врач смотр+ит мо+и +уши и г+орло.'),
      pg('stethoscope', 'Shifokor yuragimni tinglaydi. Asbob biroz sovuq boʻlishi mumkin.', 'Врач слушает моё сердце. Трубочка может быть немного холодной.', 'Врач сл+ушает мо+ё с+ердце. Тр+убочка м+ожет быть немн+ого хол+одной.'),
      pg('chair', 'Men tinch oʻtirishga harakat qilaman.', 'Я стараюсь сидеть спокойно.', 'Я стар+аюсь сид+еть спок+ойно.'),
      pg('handshake', 'Qoʻrqsam, onamning qoʻlini ushlashim mumkin.', 'Если мне страшно, я могу держать маму за руку.', '+Если мне стр+ашно, я мог+у держ+ать м+аму за р+уку.'),
      pg('house', 'Tamom! Biz uyga ketamiz.', 'Всё! Мы идём домой.', 'Вс+ё! Мы ид+ём дом+ой.'),
    ],
  },
  {
    id: 'haircut',
    title: { uz: 'Sartaroshxonada', ru: 'В парикмахерской' },
    symbol: 'barber_pole',
    pages: [
      pg('person_curly_hair', 'Sochlarim oʻsdi. Bugun sartaroshga boramiz.', 'Мои волосы выросли. Сегодня мы идём в парикмахерскую.', 'Мо+и в+олосы в+ыросли. Сег+одня мы ид+ём в парикм+ахерскую.'),
      pg('mirror', 'Sartaroshxonada katta oyna bor.', 'В парикмахерской есть большое зеркало.', 'В парикм+ахерской есть больш+ое з+еркало.'),
      pg('chair', 'Men maxsus kursiga oʻtiraman.', 'Я сажусь в особое кресло.', 'Я саж+усь в ос+обое кр+есло.'),
      pg('person_getting_haircut', 'Sartarosh yelkamni mato bilan yopadi.', 'Парикмахер накрывает мне плечи накидкой.', 'Парикм+ахер накрыв+ает мне пл+ечи нак+идкой.'),
      pg('scissors', 'Qaychi chiq-chiq qiladi. Soch kesilganda ogʻrimaydi.', 'Ножницы щёлкают: чик-чик. Стричь волосы не больно.', 'Н+ожницы щ+ёлкают: чик-чик. Стричь в+олосы не б+ольно.'),
      pg('headphone', 'Mashinka gʻuvillaydi. Ovoz baland boʻlsa, quloqchin taqishim mumkin.', 'Машинка жужжит. Если громко, я могу надеть наушники.', 'Маш+инка жужж+ит. +Если гр+омко, я мог+у над+еть н+аушники.'),
      pg('man_getting_haircut', 'Men boshimni tik tutishga harakat qilaman.', 'Я стараюсь держать голову ровно.', 'Я стар+аюсь держ+ать г+олову р+овно.'),
      pg('sparkles', 'Tamom! Oynaga qarayman. Sochim chiroyli.', 'Всё! Я смотрю в зеркало. Причёска красивая.', 'Вс+ё! Я смотр+ю в з+еркало. Прич+ёска крас+ивая.'),
    ],
  },
  {
    id: 'kindergarten_morning',
    title: { uz: 'Ertalab bogʻchada', ru: 'Утро в садике' },
    symbol: 'children_crossing',
    pages: [
      pg('sunrise', 'Ertalab men bogʻchaga kelaman.', 'Утром я прихожу в садик.', '+Утром я прихож+у в с+адик.'),
      pg('waving_hand', 'Men tarbiyachiga salom beraman. Qoʻl silkitsam ham boʻladi.', 'Я здороваюсь с воспитателем. Можно просто помахать рукой.', 'Я здор+оваюсь с воспит+ателем. М+ожно пр+осто помах+ать рук+ой.'),
      pg('coat', 'Men kiyimimni shkafchamga qoʻyaman.', 'Я кладу одежду в свой шкафчик.', 'Я клад+у од+ежду в свой шк+афчик.'),
      pg('woman', 'Onam ishga ketadi. Kechqurun u meni olib ketadi.', 'Мама уходит на работу. Вечером она меня забирает.', 'М+ама ух+одит на раб+оту. В+ечером он+а мен+я забир+ает.'),
      pg('slightly_frowning_face', 'Biroz xafa boʻlishim mumkin. Bu tabiiy.', 'Мне может быть немного грустно. Так бывает.', 'Мне м+ожет быть немн+ого гр+устно. Так быв+ает.'),
      pg('cooking', 'Biz nonushta qilamiz.', 'Мы завтракаем.', 'Мы з+автракаем.'),
      pg('teddy_bear', 'Keyin biz oʻynaymiz va qoʻshiq aytamiz.', 'Потом мы играем и поём песни.', 'Пот+ом мы игр+аем и по+ём п+есни.'),
      pg('spiral_calendar', 'Kun tartibim keyin nima boʻlishini koʻrsatadi.', 'Моё расписание показывает, что будет дальше.', 'Мо+ё распис+ание пок+азывает, что б+удет д+альше.'),
      pg('person_in_lotus_position', 'Shovqin boʻlsa, tinch burchakka borishim mumkin.', 'Если шумно, я могу пойти в тихий уголок.', '+Если ш+умно, я мог+у пойт+и в т+ихий угол+ок.'),
      pg('smiling_face_with_smiling_eyes', 'Bogʻchada kattalar menga yordam beradi.', 'В садике взрослые помогают мне.', 'В с+адике взр+ослые помог+ают мне.'),
    ],
  },
]
