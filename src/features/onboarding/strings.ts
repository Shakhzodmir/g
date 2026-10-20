import { defineStrings } from '../../i18n'

/** Strings added to the onboarding wizard (the original ones live in app/strings.ts as ONBOARDING). */
export const S = defineStrings({
  uz: {
    nameRequired: 'Ismni yozing: ilova shu ism bilan salomlashadi.',
    ageTitle: 'Yoshi (yil)',
    ageHint: 'Klaviatura va sozlamalar yoshga moslanadi. Keyin oʻzgartirish mumkin.',
    infoStep: '{n} / {total}',
    infoAdult1Title: 'Kerakli iboralar bir bosishda',
    infoAdult1Text: 'Tez-tez kerak boʻladigan iboralar bosh sahifada turadi. Klaviatura bilan yozing: ilova aytib beradi.',
  },
  ru: {
    nameRequired: 'Напишите имя: приложение будет здороваться по имени.',
    ageTitle: 'Возраст (лет)',
    ageHint: 'Клавиатура и настройки подстроятся под возраст. Позже это можно изменить.',
    infoStep: '{n} из {total}',
    infoAdult1Title: 'Нужные фразы в одно нажатие',
    infoAdult1Text: 'Частые фразы лежат на главной. Печатайте на клавиатуре: приложение произнесёт написанное.',
  },
})
