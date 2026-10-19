import { defineStrings } from '../../i18n'

/** Strings added to the onboarding wizard (the original ones live in app/strings.ts as ONBOARDING). */
export const S = defineStrings({
  uz: {
    nameRequired: 'Ismni yozing: ilova shu ism bilan salomlashadi.',
    ageTitle: 'Yoshi (yil)',
    ageHint: 'Klaviatura va sozlamalar yoshga moslanadi. Keyin oʻzgartirish mumkin.',
    infoStep: '{n} / {total}',
  },
  ru: {
    nameRequired: 'Напишите имя: приложение будет здороваться по имени.',
    ageTitle: 'Возраст (лет)',
    ageHint: 'Клавиатура и настройки подстроятся под возраст. Позже это можно изменить.',
    infoStep: '{n} из {total}',
  },
})
