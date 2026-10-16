import { describe, expect, it } from 'vitest'
import { displayUz, normalizeUz, uzLatnToCyrl, uzLatnToLatn2026 } from './orthography'

describe('normalizeUz', () => {
  it('turns any apostrophe after o/g into U+02BB', () => {
    expect(normalizeUz("o'g'il")).toBe('oʻgʻil')
    expect(normalizeUz('o‘g‘il')).toBe('oʻgʻil')
    expect(normalizeUz('o’g’il')).toBe('oʻgʻil')
    expect(normalizeUz('o`g`il')).toBe('oʻgʻil')
    expect(normalizeUz("O'zbekiston")).toBe('Oʻzbekiston')
  })

  it('turns other apostrophes into the tutuq belgisi U+02BC', () => {
    expect(normalizeUz("ma'no")).toBe('maʼno')
    expect(normalizeUz('she’r')).toBe('sheʼr')
  })

  it('leaves already-correct text untouched', () => {
    expect(normalizeUz('oʻyinchoq maʼno')).toBe('oʻyinchoq maʼno')
  })
})

describe('uzLatnToCyrl', () => {
  const cases: Array<[string, string]> = [
    ['Oʻzbekiston', 'Ўзбекистон'],
    ['shaftoli', 'шафтоли'],
    ['choy', 'чой'],
    ['gʻisht', 'ғишт'],
    ['qovun', 'қовун'],
    ['hayvon', 'ҳайвон'],
    ['yoʻq', 'йўқ'],
    ['ekran', 'экран'],
    ['ertak', 'эртак'],
    ['telefon', 'телефон'],
    ['yaxshi', 'яхши'],
    ['yulduz', 'юлдуз'],
    ['Yosh', 'Ёш'],
    ['yer', 'ер'],
    ['Yetti', 'Етти'],
    ['poyezd', 'поезд'],
    ['samolyot', 'самолёт'],
    ['mashina', 'машина'],
    ['maʼno', 'маъно'],
    ['sheʼr', 'шеър'],
    ['Asʼhob', 'Асҳоб'],
    ['Toshkent', 'Тошкент'],
    ['qoʻgʻirchoq', 'қўғирчоқ'],
    ['oʻyinchoq', 'ўйинчоқ'],
    ['bogʻcha', 'боғча'],
    ['poeziya', 'поэзия'],
    ['OLMA', 'ОЛМА'],
    ['SHOH', 'ШОҲ'],
    ['Gapimiz', 'Гапимиз'],
    ['Musicha', 'Мусича'],
  ]
  it.each(cases)('%s → %s', (latin, cyrillic) => {
    expect(uzLatnToCyrl(latin)).toBe(cyrillic)
  })

  it('uses the loanword exception list for ц/я/ь', () => {
    expect(uzLatnToCyrl('sirk')).toBe('цирк')
    expect(uzLatnToCyrl('sentabr')).toBe('сентябр')
    expect(uzLatnToCyrl('Sentabr')).toBe('Сентябр')
    expect(uzLatnToCyrl('kompyuter')).toBe('компьютер')
  })

  it('converts whole sentences and keeps punctuation and digits', () => {
    expect(uzLatnToCyrl('Men suv xohlayman.')).toBe('Мен сув хоҳлайман.')
    expect(uzLatnToCyrl('Qani olma? 3 ta!')).toBe('Қани олма? 3 та!')
    expect(uzLatnToCyrl('Ha / Yoʻq')).toBe('Ҳа / Йўқ')
  })

  it('normalizes ASCII apostrophes before converting', () => {
    expect(uzLatnToCyrl("o'g'il")).toBe('ўғил')
  })
})

describe('uzLatnToLatn2026', () => {
  it('maps sh ch oʻ gʻ to Ş Ç Ö Ğ', () => {
    expect(uzLatnToLatn2026('shaftoli oʻgʻil choy')).toBe('şaftoli öğil çoy')
    expect(uzLatnToLatn2026('Shahar Choʻl Oʻzbekiston Gʻalaba')).toBe('Şahar Çöl Özbekiston Ğalaba')
    expect(uzLatnToLatn2026('SHOH')).toBe('ŞOH')
  })

  it('keeps the tutuq belgisi', () => {
    expect(uzLatnToLatn2026('maʼno')).toBe('maʼno')
  })
})

describe('displayUz', () => {
  it('dispatches by script', () => {
    expect(displayUz("o'yin", 'latn')).toBe('oʻyin')
    expect(displayUz('oʻyin', 'cyrl')).toBe('ўйин')
    expect(displayUz('oʻyin', 'latn2026')).toBe('öyin')
  })
})
