import type { Bi } from '../../i18n/types'
import type { AppTaskDef, AppTarget, CheckKind, DomainId, TipDef } from './types'

/*
 * DRAFT content of the daily plan: short screen-free tips for the parent and links to what the app already has.
 * All sentences are original. A speech-language pathologist must read and approve them (docs/screening-spec.md).
 * Tips are practical play ideas, not treatment: they never replace a specialist.
 */

type T = readonly [minutes: number, titleUz: string, titleRu: string, bodyUz: string, bodyRu: string]

function tips(kind: CheckKind, domain: DomainId, list: readonly T[]): TipDef[] {
  return list.map(([minutes, tu, tr, bu, br], i) => ({ id: `${kind}.${domain}.t${i + 1}`, domain, minutes, title: { uz: tu, ru: tr }, body: { uz: bu, ru: br } }))
}

// ---------------------------------------------------------------------------------------------------------------
// Child speech
// ---------------------------------------------------------------------------------------------------------------
const CHILD_TIPS: Record<string, readonly T[]> = {
  vocab: [
    [3, 'Gapni bir qadam kengaytiring', 'Расширьте фразу на шаг', 'Bola «mashina» desa, siz «katta mashina ketyapti» deng. Har safar faqat bitta yangi soʻz qoʻshing.', 'Ребёнок говорит «машина» — вы отвечаете «большая машина едет». Добавляйте каждый раз только одно новое слово.'],
    [5, 'Ishlaringizni ovoz chiqarib aytib boring', 'Говорите вслух, что делаете', 'Ovqat tayyorlayotganda yoki kiyinayotganda qisqa gaplar bilan izohlang: «Suv quyamiz. Suv iliq.»', 'Во время готовки или одевания комментируйте короткими фразами: «Наливаем воду. Вода тёплая».'],
    [4, 'Savol oʻrniga tanlov bering', 'Вместо вопроса — выбор', 'Ikki narsani koʻrsatib «olma yoki banan?» deng va javobini kuting. Soʻz aytsa, uni maqtamasdan, shunchaki bering.', 'Покажите два предмета: «яблоко или банан?» — и подождите ответ. Назвал слово — просто дайте то, что он выбрал.'],
  ],
  sounds: [
    [3, 'Sekin va aniq ayting', 'Скажите чётко и неторопливо', 'Soʻzni sekin va ravshan ayting. Bola takrorlasa, yaxshi; xato qilsa, tuzatmang — oʻzingiz toʻgʻrisini yana bir marta ayting.', 'Произнесите слово медленно и ясно. Повторит — хорошо; ошибётся — не поправляйте, просто ещё раз скажите правильно сами.'],
    [4, 'Birinchi tovush oʻyini', 'Игра «на какой звук начинается»', 'Uyda birinchi tovushi bir xil narsalarni birga qidiring: «m» — mushuk, meva, mashina.', 'Ищите дома предметы на один звук: «м» — мишка, молоко, машина.'],
    [5, 'Kichik qoʻshiq va sheʼrlar', 'Короткие песенки и стишки', 'Har kuni bir xil qisqa sheʼr yoki qoʻshiqni ayting. Takrorlash tovushlarni mustahkamlaydi.', 'Каждый день повторяйте одну и ту же короткую песенку или стишок. Повторение закрепляет звуки.'],
  ],
  understanding: [
    [3, 'Bitta iltimos — bitta harakat', 'Одна просьба — одно действие', 'Avval imo bilan, keyin faqat soʻz bilan ayting: «Ber». Iltimoslarni bitta-bitta bering.', 'Сначала с жестом, потом только словами: «Дай». Давайте просьбы по одной.'],
    [5, 'Oʻyinchoqni birga qidiring', 'Ищем игрушку вместе', 'Ayiqchani yashiring: «Ayiqcha qayerda?» Topgach, birga quvoning va nomini ayting.', 'Спрячьте мишку: «Где мишка?» Нашли — порадуйтесь вместе и назовите его.'],
    [5, 'Rasmli kitob bilan', 'Книжка с картинками', 'Har sahifada bitta narsani koʻrsating va nomini ayting, keyin: «Qani, koʻrsat-chi?»', 'На каждой странице покажите один предмет и назовите его, потом спросите: «Покажи?»'],
  ],
  fluency: [
    [3, 'Oʻzingiz sekin gapiring', 'Говорите сами неторопливо', 'Gaplar orasida qisqa pauza qiling. Bolaga «sekinroq gapir» demang — oʻzingiz namuna boʻling.', 'Делайте короткие паузы между фразами. Не говорите ребёнку «говори медленнее» — покажите на своём примере.'],
    [3, 'Gapini oxirigacha tinglang', 'Дайте договорить', 'Bola tutilsa, gapini tugatib yubormang. Koʻziga qarab, xotirjam kuting.', 'Если ребёнок запнулся, не заканчивайте за него фразу. Смотрите на него и спокойно ждите.'],
    [4, 'Birga sekin nafas olamiz', 'Дышим вместе', 'Birga chuqur nafas oling va sekin «uuu» deb chiqaring. Shamni oʻchirmasdan, ohista puflang.', 'Вместе глубоко вдохните и медленно выдохните «ууу». Дуйте на воображаемую свечку мягко, не задувая её.'],
  ],
  attention: [
    [3, 'Koʻz darajasida oʻtiring', 'Сядьте на уровень глаз', 'Bola bilan yuzma-yuz oʻtiring, shunda u sizni koʻradi. Qisqa gapiring va tabassum qiling.', 'Сядьте напротив ребёнка, чтобы он видел ваше лицо. Говорите коротко и улыбайтесь.'],
    [5, 'Navbat bilan oʻynash', 'Играем по очереди', 'Kubiklar yoki pufak bilan oʻynang: «Navbat menda. Endi sende». Navbatni kutishni mashq qiling.', 'Играйте в кубики или мыльные пузыри: «Моя очередь. Теперь твоя». Тренируйте ожидание очереди.'],
    [3, 'Ku-ku va berkinmachoq', 'Ку-ку и прятки', 'Yuzingizni berkitib, «ku-ku!» deb oching. Bola kutib, kulsa, takrorlang.', 'Закройте лицо ладонями и откройте с «ку-ку!». Если малыш ждёт и смеётся, повторите.'],
  ],
  articulation: [
    [3, 'Koʻzgu oldida tabassum', 'Улыбка перед зеркалом', 'Koʻzgu oldida birga jilmaying, «naycha» qiling, tilni chiqaring. Oʻyin kabi, hazil bilan.', 'Вместе перед зеркалом улыбайтесь, вытягивайте губы «трубочкой», показывайте язык. Как игру, с юмором.'],
    [4, 'Paxtani puflaymiz', 'Дуем на ватку', 'Stol ustida paxta yoki yengil patni puflab, chiziqqacha yetkazing.', 'Пусть ребёнок дует на ватку или пёрышко на столе и «доведёт» его до линии.'],
    [3, 'Kulgili basharalar', 'Смешные гримасы', 'Navbat bilan kulgili basharalar qiling: lunjni shishiring, labni choʻzing, tilni yon tomonga suring.', 'По очереди делайте смешные рожицы: надуйте щёки, вытяните губы, подвигайте языком в стороны.'],
  ],
}

// ---------------------------------------------------------------------------------------------------------------
// Communication (signs relevant to autism): play-based, parent-led, no pressure
// ---------------------------------------------------------------------------------------------------------------
const ASD_TIPS: Record<string, readonly T[]> = {
  joint: [
    [4, 'Birga qaraymiz', 'Смотрим вместе', 'Biror narsani koʻrsatib «Qarang!» deng va bolaning nigohini kuting. Qaragach, birga jilmaying.', 'Покажите что-нибудь, скажите «Смотри!» и подождите взгляда ребёнка. Посмотрел — улыбнитесь вместе.'],
    [5, 'Bolaning qiziqishidan boshlang', 'Идите за интересом ребёнка', 'Bola nimaga qarasa, siz ham unga qarang va qisqa nomlang: «Mashina! Katta mashina».', 'На что смотрит ребёнок, на то посмотрите и вы и коротко назовите: «Машина! Большая машина».'],
    [5, 'Sirli quti', 'Коробка с сюрпризом', 'Qutiga kichik oʻyinchoq soling. Ochishdan oldin toʻxtab, bolaga qarang va kuting; keyin birga ochib quvoning.', 'Положите в коробку маленькую игрушку. Перед тем как открыть, остановитесь, посмотрите на ребёнка и подождите; потом откройте вместе.'],
  ],
  name: [
    [3, 'Ism — yoqimli narsa', 'Имя — это приятно', 'Ismini aytganda jilmaying, quchoqlang yoki yoqimli narsa bering. Ism yoqimli voqea bilan bogʻlansin.', 'Называя имя, улыбнитесь, обнимите или дайте что-то приятное. Пусть имя связывается с хорошим.'],
    [3, 'Yaqin kelib, bir marta chaqiring', 'Подойдите и позовите один раз', 'Bolaning yoniga keling, koʻz darajasiga choʻkib, ismini bir marta ohista ayting va kuting.', 'Подойдите, присядьте на уровень глаз, мягко назовите имя один раз и подождите.'],
    [3, 'Sevimli oʻyindan oldin', 'Перед любимой игрой', 'Sevimli oʻyinni boshlashdan oldin ismini ayting, bir lahza kuting, keyin boshlang.', 'Перед любимой игрой назовите имя, выждите мгновение, а потом начинайте.'],
  ],
  pointing: [
    [3, 'Oʻzingiz koʻrsating', 'Показывайте сами', 'Kun davomida narsalarni barmoq bilan koʻrsating va nomlang: «Mana it. Mana non».', 'В течение дня показывайте предметы пальцем и называйте: «Вот собака. Вот хлеб».'],
    [4, 'Ikki narsadan tanlash', 'Выбор из двух', 'Ikki narsani qoʻlingizda ushlab turing va bola ularga ishora qilishini yoki qaraishini kuting.', 'Держите в руках два предмета и подождите, пока ребёнок покажет на один из них взглядом или рукой.'],
    [4, 'Kitobda koʻrsatish', 'Показываем в книжке', 'Rasmli kitobda bolaning barmogʻini rasmga qoʻying: «Mana mushuk». Keyin u oʻzi koʻrsatishini kuting.', 'В книжке с картинками мягко ведите пальчик ребёнка к картинке: «Вот кошка». Потом подождите, покажет ли он сам.'],
  ],
  imitation: [
    [3, 'Qarsak va «xayr»', 'Хлопки и «пока»', 'Oddiy harakatlarni birga qiling: qarsak, «xayr», qoʻlni koʻtarish. Takrorlasa, quvoning.', 'Делайте простые движения вместе: хлопок, «пока», руки вверх. Повторил — порадуйтесь.'],
    [5, 'Kundalik harakatlarni takrorlash', 'Повторяем бытовые действия', 'Birga «ovqat qilamiz»: qoshiq bilan aralashtirish, qoʻgʻirchoqni uxlatish. Avval siz, keyin bola.', 'Вместе «готовим»: мешаем ложкой, укладываем куклу спать. Сначала вы, потом ребёнок.'],
    [4, 'Siz uning ortidan', 'Вы повторяете за ним', 'Bolaning harakati yoki tovushini oʻzingiz takrorlang. Keyin u sizning harakatingizni takrorlashi mumkin.', 'Повторите действие или звук ребёнка. Потом он, возможно, повторит за вами.'],
  ],
  play: [
    [5, 'Oddiy ketma-ketlik', 'Простая цепочка', 'Oʻyinda 2–3 qadam qiling: suv quying, aralashtiring, ichiring. Har qadamni qisqa soʻz bilan ayting.', 'Сыграйте цепочку из 2–3 шагов: налить, помешать, напоить. Каждый шаг называйте коротким словом.'],
    [5, 'Odatiy oʻyinga bitta yangi qadam', 'К привычной игре — один новый шаг', 'Bola sevgan oʻyinga bitta kichik yangilik qoʻshing, masalan, mashina «garajga kirsin».', 'Добавьте к любимой игре один маленький шаг: например, машинка «заезжает в гараж».'],
    [5, 'Yonma-yon oʻynaymiz', 'Играем рядом', 'Bola bilan bir xil oʻyinchoqlardan yonma-yon oʻynang. Majburlamang, shunchaki yonida boʻling.', 'Играйте рядом с ребёнком такими же игрушками. Не настаивайте, просто будьте рядом.'],
  ],
  sensory: [
    [3, 'Tinch burchak', 'Тихий уголок', 'Uyda shovqin va yorugʻlik kam boʻlgan joy tayyorlang. Bola charchaganda u yerda dam olsin.', 'Подготовьте дома место с минимумом шума и яркого света. Пусть ребёнок отдыхает там, когда устал.'],
    [3, 'Oldindan ogohlantiring', 'Предупреждайте заранее', 'Shovqinli yoki yangi ish oldidan qisqa ayting: «Hozir fen ishlaydi». Rasm yoki taymer yordam beradi.', 'Перед шумным или новым делом коротко скажите: «Сейчас включу фен». Помогут картинка или таймер.'],
    [5, 'Sensor oʻyin — kichik qadam bilan', 'Сенсорная игра — маленькими шагами', 'Yangi sensor tajribani (qum, suv, loy) juda oz miqdorda taklif qiling. Rad qilsa, bosim oʻtkazmang.', 'Предлагайте новый сенсорный опыт (песок, вода, глина) в самых малых дозах. Отказался — не настаивайте.'],
  ],
}

// ---------------------------------------------------------------------------------------------------------------
// Adults
// ---------------------------------------------------------------------------------------------------------------
const ADULT_TIPS: Record<string, readonly T[]> = {
  understanding: [
    [3, 'Qisqa gap, sekin temp', 'Короткие фразы, неспешный темп', 'Tinch joyda, bitta fikr — bitta gap bilan gapiring va javobni kuting.', 'Говорите в тихом месте, одна мысль — одна фраза, и подождите ответ.'],
    [4, 'Ikki variantli savollar', 'Вопросы с выбором из двух', '«Choy yoki suv?» kabi savollar «nima ichasiz?» dan osonroq. Kerak boʻlsa, ikkalasini koʻrsating.', 'Вопросы вроде «чай или вода?» проще, чем «что будете пить?». При необходимости покажите оба предмета.'],
    [5, 'Aytganingizni koʻrsating', 'Показывайте то, о чём говорите', 'Gapirayotganda narsani, rasmni yoki yozuvni koʻrsating. Koʻrish eshitishga yordam beradi.', 'Говоря, показывайте предмет, картинку или надпись. Зрительная опора помогает пониманию.'],
  ],
  words: [
    [4, 'Soʻz yoʻq boʻlsa, tasvirlang', 'Нет слова — опишите', 'Shakli, rangi, nima uchun ishlatilishini ayting. Bu soʻzni topishga ham yordam beradi.', 'Скажите, какой предмет по форме и цвету и для чего он нужен. Это помогает и найти само слово.'],
    [5, 'Xonadagi beshta narsa', 'Пять предметов в комнате', 'Xonadagi beshta narsani birin-ketin nomlang. Qiyin boʻlsa, birinchi tovushini ayting.', 'Назовите пять предметов в комнате. Если трудно, подскажите первый звук.'],
    [5, 'Turkum boʻyicha nomlash', 'Называем по категории', 'Bitta turkumni tanlang (taom, kiyim) va 5 ta nom ayting. Keyingi kuni boshqa turkum.', 'Выберите категорию (еда, одежда) и назовите пять слов. На следующий день — другую.'],
  ],
  clarity: [
    [4, 'Boʻgʻinlab, sekin', 'По слогам, неторопливо', 'Uzun soʻzlarni boʻgʻinlab ayting: «ra-dio-ta-fon». Tezlikni sekin oshiring.', 'Длинные слова произносите по слогам: «те-ле-фон». Скорость повышайте постепенно.'],
    [4, 'Koʻzgu oldida ogʻizni ochish', 'Раскрываем рот перед зеркалом', 'Koʻzgu oldida unlilarni (a, o, u, i) katta ochilgan ogʻiz bilan ayting.', 'Перед зеркалом произносите гласные (а, о, у, и), широко открывая рот.'],
    [3, 'Nafas va ovoz', 'Дыхание и голос', 'Chuqur nafas oling va bir chiqarishda «aaa» deb ovoz chiqaring. Har kuni bir oz uzoqroq.', 'Глубоко вдохните и на одном выдохе протяните «ааа». Каждый день чуть дольше.'],
  ],
  fluency: [
    [3, 'Nafas bilan gapirish', 'Говорить на выдохе', 'Gapirishdan oldin nafas oling va nafas chiqarayotganda gapni ayting. Gaplar qisqa boʻlsin.', 'Перед фразой сделайте вдох и произносите её на выдохе. Фразы делайте короткими.'],
    [5, 'Pauza bilan ovoz chiqarib oʻqish', 'Чтение вслух с паузами', 'Qisqa matnni ovoz chiqarib oʻqing, har gapdan keyin pauza qiling.', 'Читайте короткий текст вслух, делая паузу после каждой фразы.'],
    [5, 'Tanish qoʻshiqni past ovozda', 'Знакомая песня вполголоса', 'Yaxshi biladigan qoʻshigʻingizni past ovozda ayting. Qoʻshiq koʻpincha gapdan ravonroq chiqadi.', 'Спойте вполголоса хорошо знакомую песню. Пение часто получается плавнее, чем речь.'],
  ],
  reading: [
    [5, 'Bitta qisqa matn', 'Одна короткая заметка', 'Bitta qisqa xabarni oʻqing va nima haqida ekanini bir gap bilan ayting.', 'Прочитайте одну короткую заметку и скажите одной фразой, о чём она.'],
    [5, 'Xarid roʻyxati', 'Список покупок', 'Bugungi uch-toʻrt narsani qogʻozga yozing, keyin ovoz chiqarib oʻqing.', 'Запишите на бумаге три–четыре вещи на сегодня, затем прочитайте вслух.'],
    [3, 'Raqamlar va vaqt', 'Числа и время', 'Soatga qarab vaqtni ayting va yozing; narxlarni oʻqing. Kichik, kundalik mashq.', 'Назовите и запишите время по часам; прочитайте цены. Небольшая бытовая тренировка.'],
  ],
  memory: [
    [4, 'Uchta narsa', 'Три предмета', 'Uchta narsani nomlang va bir daqiqadan keyin takrorlang. Keyin toʻrttaga oshiring.', 'Назовите три предмета и повторите их через минуту. Потом увеличьте до четырёх.'],
    [5, 'Kunning uch qatori', 'Три строки о дне', 'Kech kirgach, bugun nima boʻlganini uch qisqa gap bilan yozing yoki ayting.', 'Вечером запишите или расскажите о дне тремя короткими фразами.'],
    [5, 'Bir ish — 10 daqiqa', 'Одно дело — 10 минут', 'Telefonni chetga qoʻyib, bitta ish bilan 10 daqiqa shugʻullaning. Keyin bir daqiqa dam oling.', 'Отложите телефон и 10 минут занимайтесь одним делом. Потом минуту отдохните.'],
  ],
}

const ALL_TIPS: Record<CheckKind, Record<string, readonly T[]>> = { child: CHILD_TIPS, asd: ASD_TIPS, adult: ADULT_TIPS }

/** The screen-free tips of one domain of one screening. */
export function tipsFor(kind: CheckKind, domain: DomainId): TipDef[] {
  const list = ALL_TIPS[kind][domain]
  return list ? tips(kind, domain, list) : []
}

/** Every tip (tests, specialist export). */
export function allTips(): TipDef[] {
  const out: TipDef[] = []
  for (const kind of ['child', 'asd', 'adult'] as const) for (const d of Object.keys(ALL_TIPS[kind])) out.push(...tipsFor(kind, d as DomainId))
  return out
}

// ---------------------------------------------------------------------------------------------------------------
// What the app already has, per domain: [minutes, target]
// ---------------------------------------------------------------------------------------------------------------
type A = readonly [minutes: number, target: AppTarget]
const game = (id: string): AppTarget => ({ type: 'game', id })
const feat = (id: Extract<AppTarget, { type: 'feature' }>['id'], sub?: string): AppTarget => ({ type: 'feature', id, ...(sub ? { sub } : {}) })

const APP: Record<CheckKind, Record<string, readonly A[]>> = {
  child: {
    vocab: [[4, game('find')], [4, feat('aac')], [4, game('animals')]],
    sounds: [[4, game('sound')], [4, game('syllables')], [4, game('build')]],
    understanding: [[4, game('point')], [3, game('find')], [4, game('routine')]],
    fluency: [[4, feat('exercises', '/blow')], [3, feat('calm')], [3, feat('exercises', '/voice')]],
    attention: [[4, game('memory')], [4, game('odd')], [3, feat('schedule')]],
    articulation: [[5, feat('exercises', '/mirror')], [4, feat('exercises', '/blow')], [3, feat('exercises', '/voice')]],
  },
  asd: {
    joint: [[5, feat('stories')], [4, game('find')], [3, feat('feelings')]],
    name: [[3, feat('aac')], [4, game('animals')], [3, feat('stories')]],
    pointing: [[4, game('point')], [4, game('find')], [4, feat('aac')]],
    imitation: [[5, feat('exercises', '/mirror')], [4, game('syllables')], [3, feat('exercises', '/voice')]],
    play: [[4, game('routine')], [4, game('memory')], [5, feat('stories')]],
    sensory: [[4, feat('calm')], [3, feat('timer')], [3, feat('schedule')]],
  },
  adult: {
    understanding: [[4, game('listen')], [4, game('wordpic')], [4, game('situations')]],
    words: [[4, game('naming')], [4, game('category')], [4, game('wordpic')]],
    clarity: [[4, feat('exercises', '/voice')], [4, feat('exercises', '/mirror')], [3, game('syllables')]],
    fluency: [[4, feat('exercises', '/voice')], [3, feat('exercises', '/blow')], [4, game('sentence')]],
    reading: [[4, game('sentence')], [4, game('wordpic')], [4, feat('aac', '?mode=keyboard')]],
    memory: [[4, game('memory')], [4, game('oddone')], [3, feat('schedule')]],
  },
}

/** The app activities (games, exercises, boards, schedule, timer) that train one domain. */
export function appTasksFor(kind: CheckKind, domain: DomainId): AppTaskDef[] {
  return (APP[kind][domain] ?? []).map(([minutes, target], i) => ({ id: `${kind}.${domain}.a${i + 1}`, domain, minutes, target }))
}

/** One-line instruction under an app activity: how the adult uses it with the person. */
export const APP_HINTS: Record<CheckKind, Record<string, Bi>> = {
  child: {
    vocab: { uz: 'Birga oʻynang va ikki-uch soʻzni ovoz chiqarib ayting.', ru: 'Играйте вместе и вслух называйте два–три слова.' },
    sounds: { uz: 'Tovushni siz ayting, bola eshitsin va takrorlasin.', ru: 'Звук произносите вы, ребёнок слушает и повторяет.' },
    understanding: { uz: 'Avval tinglash, keyin koʻrsatish. Shoshilmang.', ru: 'Сначала слушаем, потом показываем. Без спешки.' },
    fluency: { uz: 'Sekin va xotirjam. Nafasga eʼtibor bering.', ru: 'Медленно и спокойно. Следите за дыханием.' },
    attention: { uz: 'Qisqa mashgʻulot, navbat bilan. Charchasa, toʻxtang.', ru: 'Короткое занятие, по очереди. Устал — остановитесь.' },
    articulation: { uz: 'Hazil kabi, majburlamasdan. Koʻzgu yoki model yordam beradi.', ru: 'Как игра, без принуждения. Помогут зеркало или модель.' },
  },
  asd: {
    joint: { uz: 'Yonma-yon oʻtirib, ekranga birga qarang va gaplashing.', ru: 'Сидите рядом, смотрите на экран вместе и разговаривайте.' },
    name: { uz: 'Bola nomini aytib, kuting. Ekran faqat yordamchi.', ru: 'Назовите ребёнка по имени и подождите. Экран — лишь помощник.' },
    pointing: { uz: 'Bola barmogʻi bilan koʻrsatishiga imkon bering.', ru: 'Дайте ребёнку показывать пальцем.' },
    imitation: { uz: 'Avval siz qiling, keyin bola. Kulib, hazil bilan.', ru: 'Сначала вы, потом ребёнок. С улыбкой и юмором.' },
    play: { uz: 'Oʻyinni birga oʻynang, yutuq-yutqazuvsiz.', ru: 'Играйте вместе, без выигрышей и проигрышей.' },
    sensory: { uz: 'Tinch rejim: past ovoz va oz yorugʻlik. Bola xohlasa, toʻxtang.', ru: 'Спокойный режим: тихий звук и мягкий свет. Захочет закончить — останавливайтесь.' },
  },
  adult: {
    understanding: { uz: 'Tinch joyda, shoshilmasdan. Kerak boʻlsa, takrorlang.', ru: 'В тихом месте, без спешки. При необходимости повторяйте.' },
    words: { uz: 'Soʻz topilmasa, tasvirlab bering. Xato qilish normal.', ru: 'Не находится слово — опишите. Ошибаться нормально.' },
    clarity: { uz: 'Sekin, aniq, ogʻizni yaxshi ochib.', ru: 'Медленно, чётко, хорошо открывая рот.' },
    fluency: { uz: 'Nafas bilan, past ovozda. Toʻxtab dam olish mumkin.', ru: 'На выдохе, негромко. Можно остановиться и отдохнуть.' },
    reading: { uz: 'Qisqa matn, katta harflar. Charchasa, toʻxtang.', ru: 'Короткие тексты, крупные буквы. Устали — остановитесь.' },
    memory: { uz: 'Bir mashq — bir maqsad. Dam olib turing.', ru: 'Одно упражнение — одна цель. Делайте перерывы.' },
  },
}
