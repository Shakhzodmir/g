import { defineStrings } from '../../i18n'

/** Board-mode strings added by the board pass (the original ones live in app/strings.ts → BOARD). */
export const BOARD_X = defineStrings({
  uz: {
    exitShort: 'Chiqish',
    suggestedUse: 'Tavsiyani qoʻllash',
    effective: 'Ishchi maydon: {w} × {h}',
    scaleWarn: 'Bu ekranda ×{v} juda katta: tugmalar pastki panel ortida qolishi mumkin. Ishlatiladi: ×{max}.',
    reachLow: 'Bu balandlikda bolalar qoʻli deyarli yetmaydi (hisob: {raw}%). Eng kami — {p}% ishlatiladi. Ekranni pastroq oʻrnating.',
    reachHigh: 'Bolalar ekranning deyarli hammasiga yetadi (hisob: {raw}%). Eng koʻpi — {p}% ishlatiladi.',
    preview: 'Koʻrinish',
    previewNav: 'Pastki panel',
    previewZone: 'Qoʻl yetadigan qism',
    sampleText: 'Aa',
  },
  ru: {
    exitShort: 'Выйти',
    suggestedUse: 'Применить рекомендацию',
    effective: 'Рабочая область: {w} × {h}',
    scaleWarn: 'На этом экране ×{v} слишком много: кнопки могут уйти под нижнюю панель. Будет использовано: ×{max}.',
    reachLow: 'На такой высоте дети почти не дотягиваются (расчёт: {raw}%). Используется минимум — {p}%. Повесьте экран ниже.',
    reachHigh: 'Дети дотягиваются почти до всего экрана (расчёт: {raw}%). Используется максимум — {p}%.',
    preview: 'Предпросмотр',
    previewNav: 'Нижняя панель',
    previewZone: 'Зона досягаемости',
    sampleText: 'Аа',
  },
})
