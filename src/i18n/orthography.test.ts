import { describe, expect, it } from 'vitest'
import { displayUz, keepLatin, normalizeUz, uzCyrlToLatn, uzLatnToCyrl, uzLatnToLatn2026 } from './orthography'

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
    ['Gapimiz', 'Gapimiz'],
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

  it('handles loanword exceptions together with Uzbek suffixes (L-06)', () => {
    expect(uzLatnToCyrl('litsenziya')).toBe('лицензия')
    expect(uzLatnToCyrl('Litsenziyalar')).toBe('Лицензиялар')
    expect(uzLatnToCyrl('multfilm')).toBe('мультфильм')
    expect(uzLatnToCyrl('multfilmlar')).toBe('мультфильмлар')
    expect(uzLatnToCyrl('multfilmni koʻraman')).toBe('мультфильмни кўраман')
    expect(uzLatnToCyrl('kompyuterda')).toBe('компьютерда')
    expect(uzLatnToCyrl('sirkka')).toBe('циркка')
    expect(uzLatnToCyrl('sirka')).not.toContain('ц') // not a suffix of «sirk» (vinegar)
    expect(uzLatnToCyrl('MULTFILM')).toBe('МУЛЬТФИЛЬМ')
  })

  it('never transliterates acronyms, brands, keys and keepLatin() spans (L-06)', () => {
    expect(uzLatnToCyrl('AAC va PIN-kod')).toBe('AAC ва PIN-код')
    expect(uzLatnToCyrl('NCAEP 2020, ASHA')).toBe('NCAEP 2020, ASHA')
    expect(uzLatnToCyrl('A4 varaq, PDF, USB')).toBe('A4 варақ, PDF, USB')
    expect(uzLatnToCyrl('GitHub manbasi')).toBe('GitHub манбаси')
    expect(uzLatnToCyrl('Enter tugmasi, MediaPipe, Silero, Fluent')).toBe('Enter тугмаси, MediaPipe, Silero, Fluent')
    expect(uzLatnToCyrl('Gapimiz ilovasi')).toBe('Gapimiz иловаси')
  })

  it('keeps hyphenated onomatopoeia intact and ordinary lower-case words convertible', () => {
    expect(uzLatnToCyrl('moʻ-moʻ')).toBe('мў-мў')
    expect(uzLatnToCyrl('qoʻq-qoʻq')).toBe('қўқ-қўқ')
    expect(uzLatnToCyrl('gʻaq-gʻaq')).toBe('ғақ-ғақ')
    expect(uzLatnToCyrl('mak-tab')).toBe('мак-таб')
    expect(uzLatnToCyrl('pin alt')).toBe('пин алт')
    expect(uzLatnToCyrl('PIN-kod')).toBe('PIN-код')
  })

  it('profile names stay exactly as typed in every script (L-06/L-13)', () => {
    const greeting = `Salom, ${keepLatin('Oʻtkir')}!`
    expect(uzLatnToCyrl(greeting)).toBe('Салом, Oʻtkir!')
    expect(uzLatnToLatn2026(greeting)).toBe('Salom, Oʻtkir!')
    expect(displayUz(greeting, 'latn')).toBe('Salom, Oʻtkir!')
    expect(displayUz(greeting, 'cyrl')).not.toMatch(/[]/)
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

  it('leaves acronyms and brands alone', () => {
    expect(uzLatnToLatn2026('ASHA va NCAEP, GitHub')).toBe('ASHA va NCAEP, GitHub')
    expect(uzLatnToLatn2026('shaftoli ASHA')).toBe('şaftoli ASHA')
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

describe('uzCyrlToLatn', () => {
  it('turns typed Cyrillic Uzbek into canonical Latin', () => {
    expect(uzCyrlToLatn('Салом')).toBe('Salom')
    expect(uzCyrlToLatn('ўйин')).toBe('oʻyin')
    expect(uzCyrlToLatn('ғишт')).toBe('gʻisht')
    expect(uzCyrlToLatn('ер келди')).toBe('yer keldi')
    expect(uzCyrlToLatn('маъно')).toBe('maʼno')
    expect(uzCyrlToLatn('Шаҳар')).toBe('Shahar')
    expect(uzCyrlToLatn('ШОҲ')).toBe('SHOH')
  })

  it('round-trips ordinary words', () => {
    for (const w of ['olma', 'suv', 'oʻyinchoq', 'bogʻcha', 'qovun', 'yaxshi', 'yulduz', 'xohlayman', 'hayvon'])
      expect(uzCyrlToLatn(uzLatnToCyrl(w))).toBe(w)
  })

  it('leaves Latin text alone (apostrophes normalised)', () => {
    expect(uzCyrlToLatn("o'yin")).toBe('oʻyin')
    expect(uzCyrlToLatn('Salom 3')).toBe('Salom 3')
  })
})
