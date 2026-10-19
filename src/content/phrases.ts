import type { Phrase } from './types'

type Audience = Phrase['audience']

function p(
  audience: Audience,
  id: string,
  uz: string,
  ru: string,
  ruTts: string,
  symbol: string,
  uzTts?: string,
): Phrase {
  const phrase: Phrase = { id, uz, ru, ruTts, symbol, audience }
  if (uzTts) phrase.uzTts = uzTts
  return phrase
}

/* Children: short, literal, first person. The first block is the autism-critical set. */
const KID: Phrase[] = [
  p('kid', 'need_break', 'Menga tanaffus kerak', 'Мне нужен перерыв', 'Мне н+ужен перер+ыв', 'couch_and_lamp'),
  p('kid', 'too_noisy', 'Juda shovqin', 'Слишком шумно', 'Сл+ишком ш+умно', 'hear_no_evil_monkey'),
  p('kid', 'need_quiet', 'Menga tinchlik kerak', 'Мне нужна тишина', 'Мне нужн+а тишин+а', 'shushing_face'),
  p('kid', 'quiet_place', 'Tinch joy kerak', 'Мне нужно тихое место', 'Мне н+ужно т+ихое м+есто', 'person_in_lotus_position'),
  p('kid', 'hug_me', 'Meni quchoqla', 'Обними меня', 'Обним+и мен+я', 'people_hugging'),
  p('kid', 'dont_touch', 'Tegma', 'Не трогай', 'Не тр+огай', 'leftwards_pushing_hand'),
  p('kid', 'i_will_wait', 'Kutaman', 'Я подожду', 'Я подожд+у', 'hourglass_not_done'),
  p('kid', 'headphones', 'Quloqchin bering', 'Дайте наушники', 'Д+айте н+аушники', 'headphone'),
  p('kid', 'dont_want', 'Xohlamayman', 'Я не хочу', 'Я не хоч+у', 'person_gesturing_no'),
  p('kid', 'help_me', 'Yordam bering', 'Помогите мне', 'Помог+ите мне', 'ring_buoy'),
  p('kid', 'toilet', 'Hojatxonaga', 'Хочу в туалет', 'Хоч+у в туал+ет', 'toilet'),
  p('kid', 'it_hurts', 'Ogʻriyapti', 'Мне больно', 'Мне б+ольно', 'face_with_head_bandage'),
  p('kid', 'tummy_hurts', 'Qornim ogʻriyapti', 'Болит живот', 'Бол+ит жив+от', 'qorin'),
  p('kid', 'head_hurts', 'Boshim ogʻriyapti', 'Болит голова', 'Бол+ит голов+а', 'person_bald'),
  p('kid', 'tired', 'Charchadim', 'Я устаю', 'Я уста+ю', 'sleepy_face'),
  p('kid', 'sleepy', 'Uyqum keldi', 'Я хочу спать', 'Я хоч+у спать', 'yawning_face'),
  p('kid', 'enough', 'Menga yetdi', 'Мне хватит', 'Мне хв+атит', 'stop_button'),
  p('kid', 'hello', 'Salom', 'Привет', 'Прив+ет', 'waving_hand'),
  p('kid', 'bye', 'Xayr', 'Пока', 'Пок+а', 'waving_hand'),
  p('kid', 'thanks', 'Rahmat', 'Спасибо', 'Спас+ибо', 'heart_hands'),
  p('kid', 'please', 'Iltimos', 'Пожалуйста', 'Пож+алуйста', 'pleading_face'),
  p('kid', 'water_please', 'Suv bering', 'Дайте воды', 'Д+айте вод+ы', 'droplet'),
  p('kid', 'one_more_time', 'Yana bir marta', 'Ещё раз', 'Ещ+ё раз', 'repeat_button'),
  p('kid', 'my_turn', 'Mening navbatim', 'Моя очередь', 'Мо+я +очередь', 'person_raising_hand'),
  p('kid', 'lets_play', 'Oʻynaymiz', 'Давай играть', 'Дав+ай игр+ать', 'person_bouncing_ball'),
  p('kid', 'go_home', 'Uyga ketamiz', 'Пойдём домой', 'Пойд+ём дом+ой', 'house'),
  p('kid', 'wait_please', 'Kutib turing', 'Подождите', 'Подожд+ите', 'timer_clock'),
  p('kid', 'dont_understand', 'Tushunmadim', 'Я не понимаю', 'Я не поним+аю', 'confused_face'),
  p('kid', 'dont_know', 'Bilmayman', 'Я не знаю', 'Я не зн+аю', 'person_shrugging'),
]

/* Adults (aphasia, dysarthria, ALS, hospital): polite forms, no mascot tone. */
const PAIN: Phrase[] = [
  p('adult', 'pain_0', 'Ogʻriq yoʻq', 'Боли нет', 'Б+оли нет', 'keycap_0'),
  p('adult', 'pain_1', 'Ogʻriq: 1 / 10. Juda kuchsiz', 'Боль: 1 из 10. Очень слабая', 'Боль: од+ин из десят+и. +Очень сл+абая', 'keycap_1', 'Ogʻriq oʻndan bir. Juda kuchsiz'),
  p('adult', 'pain_2', 'Ogʻriq: 2 / 10. Juda kuchsiz', 'Боль: 2 из 10. Очень слабая', 'Боль: два из десят+и. +Очень сл+абая', 'keycap_2', 'Ogʻriq oʻndan ikki. Juda kuchsiz'),
  p('adult', 'pain_3', 'Ogʻriq: 3 / 10. Kuchsiz', 'Боль: 3 из 10. Слабая', 'Боль: три из десят+и. Сл+абая', 'keycap_3', 'Ogʻriq oʻndan uch. Kuchsiz'),
  p('adult', 'pain_4', 'Ogʻriq: 4 / 10. Oʻrtacha', 'Боль: 4 из 10. Средняя', 'Боль: чет+ыре из десят+и. Ср+едняя', 'keycap_4', 'Ogʻriq oʻndan toʻrt. Oʻrtacha'),
  p('adult', 'pain_5', 'Ogʻriq: 5 / 10. Oʻrtacha', 'Боль: 5 из 10. Средняя', 'Боль: пять из десят+и. Ср+едняя', 'keycap_5', 'Ogʻriq oʻndan besh. Oʻrtacha'),
  p('adult', 'pain_6', 'Ogʻriq: 6 / 10. Oʻrtacha', 'Боль: 6 из 10. Средняя', 'Боль: шесть из десят+и. Ср+едняя', 'keycap_6', 'Ogʻriq oʻndan olti. Oʻrtacha'),
  p('adult', 'pain_7', 'Ogʻriq: 7 / 10. Kuchli', 'Боль: 7 из 10. Сильная', 'Боль: семь из десят+и. С+ильная', 'keycap_7', 'Ogʻriq oʻndan yetti. Kuchli'),
  p('adult', 'pain_8', 'Ogʻriq: 8 / 10. Kuchli', 'Боль: 8 из 10. Сильная', 'Боль: в+осемь из десят+и. С+ильная', 'keycap_8', 'Ogʻriq oʻndan sakkiz. Kuchli'),
  p('adult', 'pain_9', 'Ogʻriq: 9 / 10. Juda kuchli', 'Боль: 9 из 10. Очень сильная', 'Боль: д+евять из десят+и. +Очень с+ильная', 'keycap_9', 'Ogʻriq oʻndan toʻqqiz. Juda kuchli'),
  p('adult', 'pain_10', 'Ogʻriq: 10 / 10. Chidab boʻlmaydi', 'Боль: 10 из 10. Невыносимая', 'Боль: д+есять из десят+и. Невынос+имая', 'keycap_10', 'Ogʻriq oʻndan oʻn. Chidab boʻlmaydi'),
  p('adult', 'hurts_here', 'Mana shu yerim ogʻriyapti', 'Болит вот здесь', 'Бол+ит вот здесь', 'round_pushpin'),
]

const ADULT: Phrase[] = [
  p('adult', 'understand_cant_speak', 'Men tushunaman, lekin gapira olmayman', 'Я понимаю, но не могу говорить', 'Я поним+аю, но не мог+у говор+ить', 'ear'),
  p('adult', 'ask_yes_no', 'Menga «ha» yoki «yoʻq» bilan javob beradigan savol bering', 'Задайте вопрос, на который я отвечу «да» или «нет»', 'Зад+айте вопр+ос, на кот+орый я отв+ечу «да» +или «нет»', 'check_box_with_check'),
  p('adult', 'speak_slowly', 'Iltimos, sekinroq gapiring', 'Говорите, пожалуйста, медленнее', 'Говор+ите, пож+алуйста, м+едленнее', 'turtle'),
  p('adult', 'wait_answer', 'Kuting, men javob beraman', 'Подождите, я отвечу', 'Подожд+ите, я отв+ечу', 'hourglass_not_done'),
  p('adult', 'will_write', 'Men yozib koʻrsataman', 'Я напишу', 'Я напиш+у', 'writing_hand'),
  p('adult', 'call_nurse', 'Hamshirani chaqiring', 'Позовите медсестру', 'Позов+ите медсестр+у', 'woman_health_worker'),
  p('adult', 'call_doctor', 'Shifokorni chaqiring', 'Позовите врача', 'Позов+ите врач+а', 'health_worker'),
  p('adult', 'hard_to_breathe', 'Nafas olishim qiyin', 'Мне трудно дышать', 'Мне тр+удно дыш+ать', 'lungs'),
  p('adult', 'nausea', 'Koʻnglim aynayapti', 'Меня тошнит', 'Мен+я тошн+ит', 'nauseated_face'),
  p('adult', 'dizzy', 'Boshim aylanyapti', 'У меня кружится голова', 'У мен+я кр+ужится голов+а', 'face_with_spiral_eyes'),
  p('adult', 'medicine', 'Dorimni bering', 'Дайте моё лекарство', 'Д+айте мо+ё лек+арство', 'pill'),
  p('adult', 'toilet_adult', 'Hojatxonaga borishim kerak', 'Мне нужно в туалет', 'Мне н+ужно в туал+ет', 'toilet'),
  p('adult', 'thirsty', 'Chanqadim', 'Я хочу пить', 'Я хоч+у пить', 'potable_water'),
  p('adult', 'hungry', 'Ovqat yegim keldi', 'Я хочу есть', 'Я хоч+у есть', 'fork_and_knife'),
  p('adult', 'cold', 'Sovqotyapman', 'Мне холодно', 'Мне х+олодно', 'snowflake'),
  p('adult', 'hot', 'Juda issiq', 'Мне жарко', 'Мне ж+арко', 'hot_face'),
  p('adult', 'help_lie_down', 'Yotishimga yordam bering', 'Помогите мне лечь', 'Помог+ите мне лечь', 'bed'),
  p('adult', 'help_sit_up', 'Oʻtirishimga yordam bering', 'Помогите мне сесть', 'Помог+ите мне сесть', 'chair'),
  p('adult', 'want_rest', 'Dam olmoqchiman', 'Я хочу отдохнуть', 'Я хоч+у отдохн+уть', 'couch_and_lamp'),
  p('adult', 'glasses', 'Koʻzoynagimni bering', 'Дайте мои очки', 'Д+айте мо+и очк+и', 'glasses'),
  p('adult', 'phone', 'Telefonimni bering', 'Дайте мой телефон', 'Д+айте мой телеф+он', 'mobile_phone'),
  p('adult', 'call_family', 'Oilamga qoʻngʻiroq qiling', 'Позвоните моей семье', 'Позвон+ите мо+ей семь+е', 'telephone_receiver'),
  p('adult', 'family_here', 'Oilamni chaqiring', 'Позовите мою семью', 'Позов+ите мо+ю семь+ю', 'people_hugging'),
  p('adult', 'open_window', 'Derazani oching', 'Откройте окно', 'Откр+ойте окн+о', 'window'),
  p('adult', 'light_off', 'Chiroqni oʻchiring', 'Выключите свет', 'В+ыключите свет', 'light_bulb'),
  p('adult', 'worried', 'Xavotirdaman', 'Я волнуюсь', 'Я волн+уюсь', 'anxious_face_with_sweat'),
  p('adult', 'scared', 'Qoʻrqyapman', 'Мне страшно', 'Мне стр+ашно', 'fearful_face'),
  p('adult', 'sad', 'Xafaman', 'Мне грустно', 'Мне гр+устно', 'frowning_face'),
  p('adult', 'feel_good', 'Oʻzimni yaxshi his qilyapman', 'Я чувствую себя хорошо', 'Я ч+увствую себ+я хорош+о', 'smiling_face_with_smiling_eyes'),
  p('adult', 'greeting', 'Assalomu alaykum', 'Здравствуйте', 'Здр+авствуйте', 'waving_hand'),
  p('adult', 'sorry', 'Kechirasiz', 'Извините', 'Извин+ите', 'person_bowing'),
  p('adult', 'no_thanks', 'Yoʻq, rahmat', 'Нет, спасибо', 'Нет, спас+ибо', 'person_gesturing_no'),
  p('adult', 'thank_you', 'Rahmat', 'Спасибо', 'Спас+ибо', 'heart_hands'),
]

export const PHRASES: Phrase[] = [...KID, ...PAIN, ...ADULT]
