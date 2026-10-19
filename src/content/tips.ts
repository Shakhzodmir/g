import type { ParentTip } from './types'

/*
 * "Qanday yordam beraman / Как помогать": evidence-based practices for parents of autistic
 * children (NCAEP 2020: modeling, time delay, visual supports, antecedent-based intervention,
 * naturalistic intervention, reinforcement; ASHA guidance on AAC). Polite "siz" form.
 * The app name is not written here on purpose (it comes from src/app/brand.ts).
 */
export const TIPS: ParentTip[] = [
  {
    id: 'model',
    symbol: 'backhand_index_pointing_up',
    title: { uz: 'Oʻzingiz koʻrsating', ru: 'Показывайте сами' },
    body: {
      uz: 'Bola bilan gaplashganda, aytayotgan soʻzlaringizni kommunikatorda ham bosing. Bolani bosishga yoki takrorlashga majburlamang. U sizga qarab oʻrganadi — bu «modellashtirish» deyiladi.',
      ru: 'Когда говорите с ребёнком, нажимайте те же слова на коммуникаторе. Не требуйте, чтобы он нажал или повторил. Ребёнок учится, глядя на вас, — это называется моделированием.',
    },
  },
  {
    id: 'wait',
    symbol: 'hourglass_not_done',
    title: { uz: '5–10 soniya kuting', ru: 'Подождите 5–10 секунд' },
    body: {
      uz: 'Savol bergandan keyin jim turing va ichingizda oʻngacha sanang. Autizmli bolaga javob tayyorlash uchun koʻproq vaqt kerak. Shu kutish unga oʻzi aytish imkonini beradi.',
      ru: 'Задав вопрос, помолчите и мысленно посчитайте до десяти. Ребёнку с аутизмом нужно больше времени, чтобы подготовить ответ. Эта пауза даёт ему шанс сказать самому.',
    },
  },
  {
    id: 'all_communication',
    symbol: 'left_speech_bubble',
    title: { uz: 'Har qanday muloqot muhim', ru: 'Любое общение важно' },
    body: {
      uz: 'Imo-ishora, nigoh, qoʻlingizdan tortish ham muloqotdir. Bola eshitgan gaplarini takrorlasa (exolaliya), uning ham maʼnosi bor: masalan, «xohlayman» yoki «tinchlanyapman». Javob bering va har bir urinishni qoʻllab-quvvatlang.',
      ru: 'Жесты, взгляд, когда ребёнок тянет вас за руку, — это тоже общение. Если ребёнок повторяет услышанные фразы (эхолалия), у этого есть смысл: например, «хочу» или «я успокаиваюсь». Отвечайте и поддерживайте каждую попытку.',
    },
  },
  {
    id: 'schedule',
    symbol: 'spiral_calendar',
    title: { uz: 'Kun tartibi xotirjamlik beradi', ru: 'Расписание успокаивает' },
    body: {
      uz: 'Bola nima boʻlishini oldindan bilsa, xavotiri kamayadi. Kun tartibini rasmlar bilan koʻrsating va «Avval — keyin» doskasidan foydalaning: «Avval tish yuvamiz, keyin ertak».',
      ru: 'Когда ребёнок знает, что будет дальше, тревоги меньше. Показывайте расписание картинками и пользуйтесь доской «Сначала — потом»: «Сначала чистим зубы, потом сказка».',
    },
  },
  {
    id: 'transitions',
    symbol: 'timer_clock',
    title: { uz: 'Oʻtishdan oldin ogohlantiring', ru: 'Предупреждайте о переходе' },
    body: {
      uz: 'Bir ishdan boshqasiga oʻtish autizmli bola uchun qiyin. 2–5 daqiqa oldin ayting va taymerni yoqing: «Yana 2 daqiqa, keyin ovqat». Bola rangli doira kichrayib borayotganini koʻrib turadi.',
      ru: 'Переключаться с одного занятия на другое ребёнку с аутизмом трудно. Предупредите за 2–5 минут и включите таймер: «Ещё 2 минуты, потом обед». Ребёнок видит, как цветной круг становится меньше.',
    },
  },
  {
    id: 'choices',
    symbol: 'left_right_arrow',
    title: { uz: 'Ikki narsadan tanlatish', ru: 'Выбор из двух' },
    body: {
      uz: '«Nima xohlaysan?» oʻrniga ikkita narsani koʻrsating: «Olmami yoki bananmi?». Tanlash bolaga oʻz hayotini boshqarish tuygʻusini beradi. Avval ikki narsadan boshlang, keyin asta-sekin koʻpaytiring.',
      ru: 'Вместо «Что ты хочешь?» покажите два варианта: «Яблоко или банан?». Выбор даёт ребёнку чувство, что он сам что-то решает. Начните с двух вариантов, потом постепенно добавляйте.',
    },
  },
  {
    id: 'follow_interest',
    symbol: 'sparkles',
    title: { uz: 'Bolaning qiziqishiga ergashing', ru: 'Идите за интересом ребёнка' },
    body: {
      uz: 'Bola nimani yaxshi koʻrsa — mashinalar, suv, raqamlar — oʻsha bilan birga oʻynang. Qiziq narsa ustida soʻzlar osonroq oʻrganiladi. Boʻlayotgan ishni nomlab turing: «Mashina ketdi! Yana!»',
      ru: 'Играйте с тем, что ребёнок любит: машинки, вода, цифры. Слова легче запоминаются, когда интересно. Называйте то, что происходит: «Машина поехала! Ещё!»',
    },
  },
  {
    id: 'always_available',
    symbol: 'left_speech_bubble',
    title: { uz: 'Kommunikator — bu ovoz', ru: 'Коммуникатор — это голос' },
    body: {
      uz: 'Kommunikator har doim bolaning yonida boʻlsin: uyda, koʻchada, mehmonda. Uni jazo sifatida olib qoʻymang va «ekran vaqti» deb cheklamang. Bu — bolaning ovozi.',
      ru: 'Пусть коммуникатор всегда будет рядом: дома, на улице, в гостях. Не отбирайте его в наказание и не ограничивайте как «время за экраном». Это голос ребёнка.',
    },
  },
  {
    id: 'breaks',
    symbol: 'couch_and_lamp',
    title: { uz: 'Tanaffus va sezgilarni hurmat qiling', ru: 'Уважайте перерывы и ощущения' },
    body: {
      uz: 'Shovqin, yorqin chiroq yoki odam koʻp joy bolani tez charchatadi. Tanaffuslarni oldindan rejalang va «Menga tanaffus kerak» tugmasini oʻrgating. Bola tanaffus soʻrasa, iloji boricha bering: u soʻz bilan soʻrashni oʻrganyapti.',
      ru: 'Шум, яркий свет и толпа быстро утомляют ребёнка. Планируйте перерывы заранее и научите кнопке «Мне нужен перерыв». Если ребёнок просит перерыв, по возможности давайте его: так он учится просить словами.',
    },
  },
  {
    id: 'daily_play',
    symbol: 'puzzle_piece',
    title: { uz: 'Har kuni birga oʻynang', ru: 'Играйте вместе каждый день' },
    body: {
      uz: 'Har kuni 10–15 daqiqa faqat bola bilan oʻynang: telefon va televizorsiz. Qisqa, lekin har kungi mashgʻulot uzoq, lekin kamdan-kam mashgʻulotdan foydaliroq.',
      ru: 'Каждый день 10–15 минут играйте только с ребёнком: без телефона и телевизора. Короткие ежедневные занятия полезнее длинных, но редких.',
    },
  },
  {
    id: 'praise_effort',
    symbol: 'glowing_star',
    title: { uz: 'Urinishni maqtang', ru: 'Хвалите старание' },
    body: {
      uz: 'Natijani emas, harakatni maqtang: «Oʻzing soʻrading, barakalla!». Maqtovni tinch ovozda ayting. Baland ovoz va qarsaklar baʼzi bolalarni choʻchitadi.',
      ru: 'Хвалите не результат, а старание: «Ты просишь словами — здорово!». Хвалите спокойным голосом. Громкие возгласы и хлопки пугают некоторых детей.',
    },
  },
  {
    id: 'specialist',
    symbol: 'stethoscope',
    title: { uz: 'Mutaxassis oʻrnini bosmaydi', ru: 'Не заменяет специалиста' },
    body: {
      uz: 'Ilova uyda yordam beradi, lekin logoped, defektolog yoki shifokor oʻrnini bosmaydi. Mutaxassis bilan birga ishlang va unga ilovadagi kartochkalarni koʻrsating. Tashxis va davolashni faqat mutaxassis belgilaydi.',
      ru: 'Приложение помогает дома, но не заменяет логопеда, дефектолога или врача. Занимайтесь вместе со специалистом и показывайте ему карточки из приложения. Диагноз и лечение назначает только специалист.',
    },
  },
]
