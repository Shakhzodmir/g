import type { AgeBand, AdultDomain, AsdDomain, ChildDomain, Question } from './types'

/*
 * DRAFT question bank of "Nutq tekshiruvi / Проверка речи". Every sentence is original and written for this app.
 * Nothing here has been reviewed by a specialist: see docs/screening-spec.md for the list a speech-language
 * pathologist / child neurologist must approve or rewrite before release.
 *
 * Rules for every question (a specialist may change the wording, but keep them):
 *  - it is a yes / sometimes / no question and "yes" is ALWAYS the good answer (no reverse scoring);
 *  - one idea per sentence, no medical terms, no diagnoses, no comparison with other children;
 *  - uz is canonical Uzbek Latin with U+02BB (oʻ gʻ) and U+02BC (tutuq); Cyrillic and 2026-Latin are derived at runtime.
 */

const q = (id: string, domain: Question['domain'], uz: string, ru: string): Question => ({ id, domain, text: { uz, ru } })

// ---------------------------------------------------------------------------------------------------------------
// 1. Child speech, ages 1–2 … 5–7. For every age: 5 quick questions + 6 domains x 3 questions.
// ---------------------------------------------------------------------------------------------------------------

type Item = readonly [string, string] // [uz, ru]

interface AgeSet {
  /** [domain, uz, ru] for each of the 5 quick questions. */
  quick: ReadonlyArray<readonly [ChildDomain, string, string]>
  detail: Record<ChildDomain, readonly [Item, Item, Item]>
}

const AGE_SETS: Record<AgeBand, AgeSet> = {
  // ----------------------------------------------------------------------------------------------- 1–2 years
  '1-2': {
    quick: [
      ['vocab', 'Farzandingiz maʼnoli bir nechta soʻz aytadimi (masalan, «ona», «ber», «yoʻq»)?', 'Говорит ли малыш несколько слов со смыслом (например, «мама», «дай», «нет»)?'],
      ['sounds', 'Ba-ba, ma-ma, da-da kabi boʻgʻinlarni takrorlab gʻugʻulaydimi?', 'Лепечет ли он, повторяя слоги: ба-ба, ма-ма, да-да?'],
      ['understanding', 'Oddiy iltimosni imo-ishorasiz tushunadimi (masalan, «bu yoqqa kel»)?', 'Понимает ли простую просьбу без жеста (например, «иди сюда»)?'],
      ['attention', 'Ismini aytsangiz, sizga qaraydimi?', 'Поворачивается ли он к вам, когда вы зовёте его по имени?'],
      ['attention', 'Biror narsa kerak boʻlsa, qoʻli yoki ovozi bilan sizga bildiradimi?', 'Показывает ли он рукой или голосом, чего хочет?'],
    ],
    detail: {
      vocab: [
        ['Yangi soʻzlari paydo boʻlib turadimi, hech boʻlmasa oyiga bir-ikkita?', 'Появляются ли у него новые слова — хотя бы одно-два за месяц?'],
        ['Tanish narsani koʻrsatib «bu nima?» desangiz, nomini aytishga urinadimi?', 'Пытается ли он назвать знакомый предмет, когда вы спрашиваете «что это?»?'],
        ['Bitta soʻzni turli vaziyatlarda ishlatadimi (masalan, «ber» — sut ham, oʻyinchoq ham)?', 'Использует ли одно слово в разных ситуациях (например, «дай» — и про молоко, и про игрушку)?'],
      ],
      sounds: [
        ['Gʻugʻulashida turli unli va undosh tovushlar eshitiladimi?', 'Слышны ли в его лепете разные гласные и согласные?'],
        ['Siz aytgan tovush yoki boʻgʻinni takrorlashga urinadimi?', 'Пытается ли он повторить звук или слог, который вы сказали?'],
        ['Tovushlar bilan oʻynaydimi — oʻzicha «aaa», «bububu» deb ovoz chiqaradimi?', 'Играет ли голосом — сам тянет «аааа», «буубуу»?'],
      ],
      understanding: [
        ['Ismini yoki «ona», «ota» soʻzlarini eshitganda kerakli odamga qaraydimi?', 'Смотрит ли он на нужного человека, когда слышит своё имя или слова «мама», «папа»?'],
        ['«Koʻrsat-chi» desangiz, tanish narsani yoki tana aʼzosini koʻrsatadimi?', 'Показывает ли знакомый предмет или часть тела, если сказать «покажи»?'],
        ['«Ol», «qoʻy», «olib kel» kabi qisqa iltimoslarni bajaradimi?', 'Выполняет ли короткие просьбы вроде «возьми», «положи», «принеси»?'],
      ],
      fluency: [
        ['Gʻugʻulashi ohangdor, xuddi gapirayotgandek eshitiladimi?', 'Звучит ли его лепет мелодично, «как настоящая речь»?'],
        ['Siz bilan navbatma-navbat tovush chiqarib «suhbatlashadimi»?', '«Переговаривается» ли он с вами по очереди звуками?'],
        ['Ovozi bilan quvonch, hayrat yoki norozilikni bildiradimi?', 'Выражает ли голосом радость, удивление или недовольство?'],
      ],
      attention: [
        ['Koʻzlariga qarab, jilmayishingizga javob beradimi?', 'Смотрит ли в глаза и отвечает ли улыбкой на вашу улыбку?'],
        ['Qiziq narsani barmogʻi bilan koʻrsatadimi?', 'Показывает ли пальцем на интересное?'],
        ['Oddiy oʻyinlarda (kuku, «ushlab ol») ishtirok etadimi?', 'Участвует ли в простых играх («ку-ку», «поймай»)?'],
      ],
      articulation: [
        ['Kunduzi asosan burni orqali nafas oladimi, ogʻzi koʻpincha yopiq turadimi?', 'Дышит ли он днём в основном носом, а рот чаще закрыт?'],
        ['Qattiq ovqatni (non, olma boʻlakchasi) chaynashga urinadimi?', 'Пытается ли жевать твёрдую пищу (хлеб, кусочек яблока)?'],
        ['Tili va lablarini harakatlantiradimi — masalan, oʻpich yuboradi yoki tilini chiqaradi?', 'Двигает ли языком и губами — например, посылает поцелуй или показывает язык?'],
      ],
    },
  },
  // ----------------------------------------------------------------------------------------------- 2–3 years
  '2-3': {
    quick: [
      ['vocab', 'Ikki soʻzni bir gapga qoʻshib aytadimi (masalan, «ona, ber», «mashina ketdi»)?', 'Соединяет ли он два слова в одну фразу («мама, дай», «машина поехала»)?'],
      ['sounds', 'Yaqinlari uning gapining koʻp qismini tushunadimi?', 'Понимают ли близкие большую часть того, что он говорит?'],
      ['understanding', 'Ikki qismli iltimosni bajaradimi (masalan, «etigingni ol va menga ber»)?', 'Выполняет ли просьбу из двух частей («возьми ботинок и дай мне»)?'],
      ['attention', 'Ismini aytganingizda oʻyinini toʻxtatib, sizga qaraydimi?', 'Отвлекается ли от игры и смотрит на вас, когда вы зовёте его по имени?'],
      ['fluency', 'Gapi silliq chiqadimi, tovush va boʻgʻinlarni qayta-qayta takrorlab qolmaydimi?', 'Говорит ли он плавно, без застреваний и повторов звуков и слогов?'],
    ],
    detail: {
      vocab: [
        ['Kerakli narsalarni soʻz bilan aytadimi (suv, non, mashina)?', 'Называет ли нужные предметы словами (вода, хлеб, машина)?'],
        ['Har hafta yangi soʻzlar paydo boʻladimi?', 'Появляются ли новые слова почти каждую неделю?'],
        ['«Ona, ichdi», «dada ketdi» kabi qisqa gaplar tuza oladimi?', 'Строит ли короткие фразы вроде «мама, пить», «папа ушёл»?'],
      ],
      sounds: [
        ['«p», «b», «m», «t», «d» kabi oson tovushlarni ayta oladimi?', 'Произносит ли простые звуки: п, б, м, т, д?'],
        ['Soʻzlarning boshi va oxirini tushirib qoldirmay aytadimi?', 'Договаривает ли начало и конец слов, не «глотая» их?'],
        ['Tanish soʻzni har safar taxminan bir xil aytadimi?', 'Говорит ли знакомое слово примерно одинаково каждый раз?'],
      ],
      understanding: [
        ['«Mushuk qani?» desangiz, rasmdan toʻgʻri koʻrsatadimi?', 'Показывает ли нужную картинку на вопрос «где кошка?»?'],
        ['«Bu nima?», «bu kim?» savollariga javob berishga urinadimi?', 'Пытается ли ответить на вопросы «что это?», «кто это?»?'],
        ['«Katta — kichik», «ichida — ustida» kabi oddiy soʻzlarni tushunadimi?', 'Понимает ли простые слова «большой — маленький», «в — на»?'],
      ],
      fluency: [
        ['Gapirganda sezilarli toʻxtashlarsiz gapiradimi?', 'Говорит ли без заметных остановок и застреваний?'],
        ['Gapni boshlaganda birinchi tovushni choʻzib yoki takrorlab qolmaydimi (m-m-mashina)?', 'Не растягивает ли и не повторяет первый звук, начиная фразу (м-м-машина)?'],
        ['Biror narsa aytmoqchi boʻlib, ovozsiz «qotib» qolmaydimi?', 'Не «замирает» ли он беззвучно, когда хочет что-то сказать?'],
      ],
      attention: [
        ['Siz bilan 2–3 daqiqa birga oʻynaydimi (kitob, kubiklar)?', 'Играет ли с вами вместе 2–3 минуты (книжка, кубики)?'],
        ['Qiziq narsani koʻrsatib, shu payt sizga ham qaraydimi?', 'Показывает ли интересное и смотрит ли при этом на вас?'],
        ['Boshqa bolalarga qiziqish bildiradimi — qaraydi, yaqinlashadi?', 'Проявляет ли интерес к другим детям — смотрит, подходит?'],
      ],
      articulation: [
        ['Burni orqali nafas oladimi, uxlaganda ogʻzi doim ochiq boʻlmaydimi?', 'Дышит ли носом и не спит ли постоянно с открытым ртом?'],
        ['Soʻlagi tez-tez oqmaydimi (tish chiqish davridan tashqari)?', 'Нет ли постоянного слюнотечения (вне периода прорезывания зубов)?'],
        ['Zich ovqatni (kotlet, non) bemalol chaynaydimi?', 'Спокойно ли жуёт плотную еду (котлета, хлеб)?'],
      ],
    },
  },
  // ----------------------------------------------------------------------------------------------- 3–4 years
  '3-4': {
    quick: [
      ['vocab', 'Uch-toʻrt soʻzdan iborat gaplar tuzadimi (masalan, «Men sut ichmoqchiman»)?', 'Строит ли он фразы из трёх–четырёх слов («я хочу пить молоко»)?'],
      ['sounds', 'Kam tanish kishilar ham uning gapini tushunadimi?', 'Понимают ли его речь мало знакомые люди?'],
      ['understanding', 'Qisqa hikoyani yoki ikki-uch qismli iltimosni tushunadimi?', 'Понимает ли он короткий рассказ или просьбу из двух–трёх шагов?'],
      ['fluency', 'Gapi silliq, sezilarli tutilishlarsiz chiqadimi?', 'Речь плавная, без заметных запинок?'],
      ['attention', 'Savol beradimi («nega?», «bu nima?») va javobni tinglaydimi?', 'Задаёт ли вопросы («почему?», «что это?») и слушает ли ответ?'],
    ],
    detail: {
      vocab: [
        ['Ranglar, hayvonlar va kiyimlar nomini biladimi?', 'Знает ли названия цветов, животных, предметов одежды?'],
        ['Gapida «men», «sen», «bu», «u» kabi soʻzlarni ishlatadimi?', 'Использует ли в речи слова «я», «ты», «это», «он»?'],
        ['Kun davomida boʻlgan voqeani ikki-uch gap bilan aytib bera oladimi?', 'Может ли рассказать о событии дня в двух–трёх фразах?'],
      ],
      sounds: [
        ['«s», «z», «sh» tovushlarini aytishga urinadimi (aniq chiqmasa ham)?', 'Пытается ли произносить с, з, ш (пусть и неточно)?'],
        ['Uzun soʻzlarni (masalan, «velosiped») boʻgʻinlarini tushirmay aytadimi?', 'Произносит ли длинные слова (например, «велосипед»), не теряя слоги?'],
        ['Faqat yaqinlari emas, boshqa kattalar ham gapini tushunadimi?', 'Понимают ли его не только близкие, но и другие взрослые?'],
      ],
      understanding: [
        ['«Avval qoʻlingni yuv, keyin kel» kabi ikki qismli topshiriqni bajaradimi?', 'Выполняет ли поручение из двух шагов («сначала помой руки, потом приходи»)?'],
        ['«Qayerda?», «kim?», «nega?» savollarini tushunadimi?', 'Понимает ли вопросы «где?», «кто?», «почему?»?'],
        ['Qisqa ertakni tinglab, oddiy savolga javob beradimi?', 'Отвечает ли на простой вопрос по короткой сказке?'],
      ],
      fluency: [
        ['Soʻz yoki boʻgʻinni takrorlab (ka-ka-kaptar) qolmaydimi?', 'Не повторяет ли слоги и слова (го-го-голубь)?'],
        ['Gap boshida yoki oʻrtasida jim «qotib» qolmaydimi?', 'Не «застревает» ли он молча перед словом или посреди фразы?'],
        ['Hayajonlanganda yoki charchaganda ham gapi silliq boʻlib qoladimi?', 'Остаётся ли речь плавной, даже когда он взволнован или устал?'],
      ],
      attention: [
        ['Yoshiga mos oʻyinni 5 daqiqagacha davom ettiradimi?', 'Играет ли в одну игру до 5 минут?'],
        ['Suhbatda navbat kutadimi — siz aytganingizdan keyin javob beradimi?', 'Ждёт ли очереди в разговоре — отвечает после вас?'],
        ['«Doʻkon», «shifokor» kabi oʻyin-rollarni oʻynaydimi?', 'Играет ли в «понарошку» (магазин, доктор)?'],
      ],
      articulation: [
        ['Tilini tepaga va yon tomonga harakatlantira oladimi (masalan, labini yalash)?', 'Может ли двигать языком вверх и в стороны (например, облизать губы)?'],
        ['Kunduzi ogʻzi yopiq, burni orqali nafas oladimi?', 'Дышит ли днём носом, с закрытым ртом?'],
        ['Shamga, naychaga puflay oladimi yoki pufak chiqara oladimi?', 'Умеет ли дуть — на свечку, в трубочку, пускать пузыри?'],
      ],
    },
  },
  // ----------------------------------------------------------------------------------------------- 4–5 years
  '4-5': {
    quick: [
      ['vocab', 'Voqeani bir necha bogʻlangan gap bilan aytib beradimi?', 'Рассказывает ли он о событии несколькими связными фразами?'],
      ['sounds', '«s», «z», «sh», «l» tovushlarini deyarli toʻgʻri aytadimi?', 'Произносит ли звуки с, з, ш, л почти правильно?'],
      ['understanding', 'Uch qismli topshiriqni eshitib bajara oladimi?', 'Выполняет ли поручение из трёх шагов, услышав его один раз?'],
      ['fluency', 'Gapi tekis, tutilishlarsiz ketadimi?', 'Речь плавная, без запинок?'],
      ['attention', 'Bir mashgʻulot bilan 10 daqiqagacha band boʻla oladimi (rasm chizish, konstruktor)?', 'Может ли заниматься одним делом до 10 минут (рисование, конструктор)?'],
    ],
    detail: {
      vocab: [
        ['Gapida «ustida», «ostida», «ichida», «orqasida» kabi soʻzlarni oʻrinli ishlatadimi?', 'Использует ли слова «на», «под», «в», «за» в нужном смысле?'],
        ['Yangi eshitgan soʻzning maʼnosini soʻraydimi («bu nima degani?»)?', 'Спрашивает ли значение нового слова («что это значит?»)?'],
        ['Qarama-qarshi maʼnolarni biladimi (katta — kichik, issiq — sovuq)?', 'Знает ли противоположности (большой — маленький, горячий — холодный)?'],
      ],
      sounds: [
        ['Soʻzlarni boʻgʻin va tovushlarini tushirmay, toʻliq aytadimi?', 'Произносит ли слова целиком, не пропуская слоги и звуки?'],
        ['Notanish kishilar ham gapini tushunadimi?', 'Понимают ли его речь посторонние люди?'],
        ['«s—sh», «z—j» kabi oʻxshash tovushlarni aralashtirmaydimi?', 'Не смешивает ли похожие звуки: с–ш, з–ж?'],
      ],
      understanding: [
        ['Hikoyadan keyin «nega bunday boʻldi?» savoliga javob beradimi?', 'Отвечает ли на вопрос «почему так случилось?» после рассказа?'],
        ['«Avval», «keyin», «oxirida» soʻzlarini tushunadimi?', 'Понимает ли слова «сначала», «потом», «в конце»?'],
        ['Oddiy qoidani tushunib, unga amal qilishga urinadimi?', 'Понимает ли простое правило и старается ему следовать?'],
      ],
      fluency: [
        ['Gapirayotganda toʻxtab qolish va takrorlashlar kam uchraydimi?', 'Мало ли заметно остановок и повторов, когда он говорит?'],
        ['Uzun gapni ham silliq aytadimi?', 'Произносит ли длинную фразу плавно?'],
        ['Savolga javob berayotganda gapi tutilib qolmaydimi?', 'Не запинается ли он, отвечая на вопрос?'],
      ],
      attention: [
        ['Birgalikdagi oʻyinda qoida va navbatga amal qiladimi?', 'Соблюдает ли правила и очередь в совместной игре?'],
        ['Suhbatdoshga qaraydimi va suhbatni davom ettiradimi?', 'Смотрит ли на собеседника и поддерживает ли разговор?'],
        ['Boshqa bolalar bilan birga oʻynashni xohlaydimi?', 'Хочет ли играть вместе с другими детьми?'],
      ],
      articulation: [
        ['Til uchini yuqori tishlarning orqasiga koʻtara oladimi?', 'Может ли поднять кончик языка за верхние зубы?'],
        ['Lablarini «naycha» qilib choʻzib, keyin jilmaya oladimi?', 'Умеет ли вытянуть губы «трубочкой», а потом улыбнуться?'],
        ['Kunduzi ham, uyquda ham burni orqali nafas oladimi, xurrak otmaydimi?', 'Дышит ли днём и во сне носом, без храпа?'],
      ],
    },
  },
  // ----------------------------------------------------------------------------------------------- 5–7 years
  '5-7': {
    quick: [
      ['vocab', 'Ertak yoki hikoyani boshi va oxiri bilan izchil aytib beradimi?', 'Пересказывает ли он сказку или рассказ связно, с началом и концом?'],
      ['sounds', 'Deyarli barcha tovushlarni, shu jumladan «r» va «l» ni toʻgʻri aytadimi?', 'Произносит ли он почти все звуки, включая р и л, правильно?'],
      ['understanding', 'Murakkabroq gaplarni va bir necha qismli topshiriqlarni tushunadimi?', 'Понимает ли он сложные фразы и поручения из нескольких шагов?'],
      ['fluency', 'Gapi ravon, sezilarli tutilishlarsiz chiqadimi?', 'Речь плавная, без заметных запинок?'],
      ['attention', 'Mashgʻulotda 10–15 daqiqa diqqatini jamlay oladimi?', 'Может ли он сосредоточиться на занятии 10–15 минут?'],
    ],
    detail: {
      vocab: [
        ['Rasm boʻyicha toʻrt-besh gapdan iborat hikoya tuza oladimi?', 'Составляет ли рассказ из четырёх–пяти фраз по картинке?'],
        ['Umumlashtiruvchi soʻzlarni (mevalar, kiyimlar, mebel) biladimi?', 'Знает ли обобщающие слова (фрукты, одежда, мебель)?'],
        ['Gapida «chunki», «agar», «lekin» kabi bogʻlovchilarni ishlatadimi?', 'Использует ли в речи слова «потому что», «если», «но»?'],
      ],
      sounds: [
        ['«r» va «l» tovushlari soʻzning boshida, oʻrtasida va oxirida toʻgʻri chiqadimi?', 'Правильно ли звучат р и л в начале, середине и конце слов?'],
        ['«sh», «s», «ch», «j» kabi tovushlarni aralashtirmaydimi?', 'Не путает ли звуки ш, с, ч, ж?'],
        ['Murakkab soʻzlarni (masalan, «ekskavator») boʻgʻinlarini tushirmay aytadimi?', 'Произносит ли сложные слова (например, «экскаватор»), не теряя слоги?'],
      ],
      understanding: [
        ['Bir necha gapdan iborat hikoyani tinglab, voqealar tartibini aytib bera oladimi?', 'Может ли после рассказа из нескольких фраз передать порядок событий?'],
        ['Ertakdagi sabab va oqibatni tushunadimi?', 'Понимает ли причины и следствия в сказке?'],
        ['Ogʻzaki koʻrsatmani (chiz, yigʻ) qadamma-qadam bajaradimi?', 'Выполняет ли устную инструкцию по шагам (нарисуй, собери)?'],
      ],
      fluency: [
        ['Fikrini bayon qilganda tovush yoki soʻzlarni takrorlamaydimi?', 'Не повторяет ли звуки и слова, когда излагает мысль?'],
        ['Uydan tashqarida — bogʻchada, mashgʻulotda ham ravon gapiradimi?', 'Остаётся ли речь плавной и вне дома — в саду, на занятии?'],
        ['Tutilib qolishdan qochib, gapirmay qolmaydimi yoki gapini qisqartirmaydimi?', 'Не избегает ли он разговора и не сокращает ли фразы из-за запинок?'],
      ],
      attention: [
        ['Unchalik qiziq boʻlmagan topshiriqni ham 10 daqiqagacha bajara oladimi?', 'Может ли выполнять не самое интересное задание до 10 минут?'],
        ['Suhbat mavzusini ushlab turadimi, oʻz navbatini kutadimi?', 'Держится ли темы разговора, дожидается ли своей очереди?'],
        ['Tengdoshlari bilan oʻyinda qoidalarga amal qiladimi?', 'Соблюдает ли правила в игре со сверстниками?'],
      ],
      articulation: [
        ['Til va lablari tez va aniq harakatlanadimi (til uchi, «naycha», «tabassum»)?', 'Быстро ли и чётко двигаются язык и губы (кончик языка, «трубочка», «улыбка»)?'],
        ['Burni orqali erkin nafas oladimi, ogʻzi ochiq yurmaydimi?', 'Свободно ли он дышит носом, не ходит ли с открытым ртом?'],
        ['Ovqatni yaxshi chaynaydimi va yutayotganda qiynalmaydimi?', 'Хорошо ли он жуёт и глотает без затруднений?'],
      ],
    },
  },
}

const AGE_KEY: Record<AgeBand, string> = { '1-2': 'a1', '2-3': 'a2', '3-4': 'a3', '4-5': 'a4', '5-7': 'a5' }

const CHILD_ORDER: readonly ChildDomain[] = ['vocab', 'sounds', 'understanding', 'fluency', 'attention', 'articulation']

/** The 5 quick questions of an age (`cq.<age>.<n>`). */
export function childQuick(age: AgeBand): Question[] {
  return AGE_SETS[age].quick.map(([domain, uz, ru], i) => q(`cq.${AGE_KEY[age]}.${i + 1}`, domain, uz, ru))
}

/** The 18 detailed questions of an age (`cd.<age>.<domain>.<n>`), six domains x 3, in domain order. */
export function childDetail(age: AgeBand): Question[] {
  const out: Question[] = []
  for (const d of CHILD_ORDER) AGE_SETS[age].detail[d].forEach(([uz, ru], i) => out.push(q(`cd.${AGE_KEY[age]}.${d}.${i + 1}`, d, uz, ru)))
  return out
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Communication / signs relevant to autism, ages 1–5. Not a diagnosis: a validated instrument and a specialist decide.
// ---------------------------------------------------------------------------------------------------------------

const ASD_SET: Record<AsdDomain, readonly [Item, Item, Item]> = {
  joint: [
    ['Siz biror narsaga qarasangiz, farzandingiz ham shu tomonga qaraydimi?', 'Если вы посмотрите на что-то, смотрит ли ребёнок в ту же сторону?'],
    ['Qiziq narsani koʻrsatib, quvonchini boʻlishish uchun sizga ham qaraydimi?', 'Показывает ли он интересную вещь и смотрит ли при этом на вас, чтобы поделиться радостью?'],
    ['Oʻyinchoq yoki rasmni sizga koʻrsatish uchun olib keladimi?', 'Приносит ли он игрушку или картинку, чтобы вам показать?'],
  ],
  name: [
    ['Ismi aytilganda odatda qaraydimi yoki javob beradimi?', 'Откликается ли он обычно, когда его зовут по имени?'],
    ['Oʻyinga berilib turganda ham ismini eshitib, hech boʻlmasa nigohi bilan javob beradimi?', 'Реагирует ли на своё имя, даже увлёкшись игрой, — хотя бы взглядом?'],
    ['Boshqa xonadan chaqirsangiz, javob berib yoki kelib turadimi?', 'Откликается ли, если позвать его из другой комнаты?'],
  ],
  pointing: [
    ['Barmogʻi bilan narsalarni koʻrsatadimi (mashina, it, suv)?', 'Показывает ли он пальцем на предметы (машина, собака, вода)?'],
    ['Biror narsani xohlasa, unga ishora qilib soʻraydimi?', 'Просит ли он что-то, показывая на это пальцем?'],
    ['«Qara, u yerda nima bor?» deb ishora qilsangiz, ishorangiz tomonga qaraydimi?', 'Смотрит ли туда, куда показываете вы, когда говорите «смотри, что там»?'],
  ],
  imitation: [
    ['Qarsak chalish, «xayr» qilish kabi harakatlaringizni takrorlaydimi?', 'Повторяет ли он ваши движения — хлопок в ладоши, «пока»?'],
    ['Kundalik ishlarni taqlid qiladimi (telefonda gaplashish, qoshiq bilan aralashtirish)?', 'Подражает ли бытовым действиям (говорить по телефону, мешать ложкой)?'],
    ['Yuz ifodangizni yoki chiqargan tovushingizni takrorlashga urinadimi?', 'Пытается ли повторить выражение вашего лица или звук?'],
  ],
  play: [
    ['Oʻyinchoqlar bilan vazifasiga koʻra oʻynaydimi (mashinani yurgizadi, qoʻgʻirchoqni ovqatlantiradi)?', 'Играет ли он игрушками по назначению (катает машинку, кормит куклу)?'],
    ['Sizni oʻz oʻyiniga chaqiradimi yoki sizning oʻyiningizga qoʻshiladimi?', 'Зовёт ли вас в свою игру или присоединяется к вашей?'],
    ['Turli oʻyinlarga qiziqadimi, faqat bitta ish bilan (masalan, gʻildirak aylantirish) band boʻlib qolmaydimi?', 'Интересуется ли разными играми, а не только одним занятием (например, крутить колёсики)?'],
  ],
  sensory: [
    ['Kundalik tovushlarga (changyutgich, fen) nisbatan xotirjam javob beradimi?', 'Относительно спокойно ли он реагирует на бытовые звуки (пылесос, фен)?'],
    ['Yangi ovqat, kiyim yoki joyga juda qattiq qarshilik qilmaydimi?', 'Не сопротивляется ли очень сильно новой еде, одежде или месту?'],
    ['Teginish, yorqin yorugʻlik, yuvinish yoki sochini oldirishga odatda chidaydimi?', 'Обычно ли он переносит прикосновения, яркий свет, умывание или стрижку?'],
  ],
}

const ASD_ORDER: readonly AsdDomain[] = ['joint', 'name', 'pointing', 'imitation', 'play', 'sensory']

/** The 18 questions of the communication check (`as.<domain>.<n>`). One set for ages 1–5. */
export function asdQuestions(): Question[] {
  const out: Question[] = []
  for (const d of ASD_ORDER) ASD_SET[d].forEach(([uz, ru], i) => out.push(q(`as.${d}.${i + 1}`, d, uz, ru)))
  return out
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Adults (after a stroke, aphasia-type difficulties). Written in the "siz / вы" form: when someone fills it in
//    for another person, they answer on that person's behalf.
// ---------------------------------------------------------------------------------------------------------------

const ADULT_SET: Record<AdultDomain, readonly [Item, Item, Item]> = {
  understanding: [
    ['Tinch joyda bir-ikki kishi bilan suhbatni tushunasizmi?', 'Понимаете ли вы разговор с одним–двумя людьми в спокойной обстановке?'],
    ['Ikki qismli iltimosni («stakanni oling va stolga qoʻying») tushunasizmi?', 'Понимаете ли просьбу из двух шагов («возьмите стакан и поставьте на стол»)?'],
    ['Tez gapirilganda yoki atrofda shovqin boʻlganda ham mazmunini ilgʻay olasizmi?', 'Удаётся ли уловить смысл, когда говорят быстро или рядом шумно?'],
  ],
  words: [
    ['Kundalik narsalarning nomini tez topasizmi?', 'Быстро ли вы находите названия повседневных предметов?'],
    ['Kerakli soʻz esingizga kelmasa, boshqacha qilib tushuntira olasizmi?', 'Если нужное слово не вспоминается, удаётся ли объяснить другими словами?'],
    ['Fikringizni tugallangan gap bilan aytib bera olasizmi?', 'Получается ли выразить мысль законченной фразой?'],
  ],
  clarity: [
    ['Yaqinlaringiz gapingizni qayta soʻramasdan tushunadimi?', 'Понимают ли вас близкие без переспрашивания?'],
    ['Kam tanish odamlar ham gapingizni tushunadimi?', 'Понимают ли вас мало знакомые люди?'],
    ['Uzoq gaplashganda yoki charchaganda ham talaffuzingiz aniq qoladimi?', 'Остаётся ли речь чёткой при долгом разговоре и усталости?'],
  ],
  fluency: [
    ['Gapingiz ravon, uzoq pauzalarsiz chiqadimi?', 'Речь плавная, без долгих пауз?'],
    ['Gapni boshlash oson kechadimi?', 'Легко ли вам начать фразу?'],
    ['Nafasingiz bir chiqarishda besh-olti soʻzli gapga yetadimi?', 'Хватает ли дыхания, чтобы сказать фразу из пяти–шести слов на одном выдохе?'],
  ],
  reading: [
    ['Qisqa matnni (yangilik, xabar) oʻqib, mazmunini tushunasizmi?', 'Читаете ли вы короткий текст (новость, сообщение) и понимаете ли смысл?'],
    ['Qisqa xabar yoki roʻyxat yoza olasizmi?', 'Можете ли написать короткое сообщение или список?'],
    ['Raqamlar, narx va vaqtni oʻqish hamda yozish qiyinlik tugʻdirmaydimi?', 'Легко ли читать и записывать числа, цены и время?'],
  ],
  memory: [
    ['Suhbat ipini yoʻqotmay, mavzuda turib gaplasha olasizmi?', 'Удаётся ли держать нить разговора?'],
    ['Qisqa iltimos yoki uch narsalik roʻyxatni eslab qolasizmi?', 'Запоминаете ли короткую просьбу или список из трёх вещей?'],
    ['Bir ish bilan 10–15 daqiqa chalgʻimay shugʻullana olasizmi?', 'Можете ли заниматься одним делом 10–15 минут, не отвлекаясь?'],
  ],
}

const ADULT_ORDER: readonly AdultDomain[] = ['understanding', 'words', 'clarity', 'fluency', 'reading', 'memory']

/** The 18 questions of the adult check (`ad.<domain>.<n>`). */
export function adultQuestions(): Question[] {
  const out: Question[] = []
  for (const d of ADULT_ORDER) ADULT_SET[d].forEach(([uz, ru], i) => out.push(q(`ad.${d}.${i + 1}`, d, uz, ru)))
  return out
}

/** Every question of the bank (for tests and for the specialist's export). */
export function allQuestions(): Question[] {
  const out: Question[] = []
  for (const age of Object.keys(AGE_SETS) as AgeBand[]) out.push(...childQuick(age), ...childDetail(age))
  out.push(...asdQuestions(), ...adultQuestions())
  return out
}
