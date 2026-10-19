import { describe, expect, it } from 'vitest'
import { WORDS } from '../../content/vocab'
import { buildCoreBoard, CORE_SIZE } from './core'
import { latn2026ToLatn, layoutFor, LAYOUTS, toCanonicalUz, uzCyrlToLatn } from './keyboard'
import { EMPTY_MESSAGE, MESSAGE_LIMIT, messageReducer, type MessageState } from './message'
import { applyPrediction, currentPrefix, predict, tokenize } from './predict'

const item = (n: number) => ({ key: `w.w${n}`, text: { uz: `s${n}`, ru: `с${n}` }, symbol: 'plus', fitz: 'misc' as const })

describe('message reducer', () => {
  it('adds items with unique ids, removes the last one and clears', () => {
    let s: MessageState = EMPTY_MESSAGE
    s = messageReducer(s, { type: 'add', item: item(1) })
    s = messageReducer(s, { type: 'add', item: item(1) })
    s = messageReducer(s, { type: 'add', item: item(2) })
    expect(s.items.map((i) => i.key)).toEqual(['w.w1', 'w.w1', 'w.w2'])
    expect(new Set(s.items.map((i) => i.uid)).size).toBe(3)
    s = messageReducer(s, { type: 'backspace' })
    expect(s.items.map((i) => i.key)).toEqual(['w.w1', 'w.w1'])
    s = messageReducer(s, { type: 'clear' })
    expect(s.items).toEqual([])
  })

  it('does nothing on backspace / clear when empty', () => {
    expect(messageReducer(EMPTY_MESSAGE, { type: 'backspace' })).toBe(EMPTY_MESSAGE)
    expect(messageReducer(EMPTY_MESSAGE, { type: 'clear' })).toBe(EMPTY_MESSAGE)
  })

  it('keeps at most 20 items', () => {
    let s: MessageState = EMPTY_MESSAGE
    for (let i = 0; i < 25; i++) s = messageReducer(s, { type: 'add', item: item(i) })
    expect(MESSAGE_LIMIT).toBe(20)
    expect(s.items).toHaveLength(20)
    expect(s.items[19].key).toBe('w.w19')
    s = messageReducer(s, { type: 'backspace' })
    s = messageReducer(s, { type: 'add', item: item(99) })
    expect(s.items[19].key).toBe('w.w99')
  })
})

describe('core board masking', () => {
  const visible = (level: 1 | 2 | 3, hidden: string[] = []) => buildCoreBoard(WORDS, level, hidden).filter((c) => c.word)

  it('always has 36 positions', () => {
    for (const level of [1, 2, 3] as const) expect(buildCoreBoard(WORDS, level)).toHaveLength(CORE_SIZE * CORE_SIZE)
  })

  it('level 1 shows exactly 9 words, level 2 18, level 3 36', () => {
    expect(visible(1)).toHaveLength(9)
    expect(visible(2)).toHaveLength(18)
    expect(visible(3)).toHaveLength(36)
  })

  it('positions at level 1 and 2 are identical to level 3', () => {
    const full = buildCoreBoard(WORDS, 3)
    for (const level of [1, 2] as const) {
      buildCoreBoard(WORDS, level).forEach((cell, i) => {
        expect(cell.row).toBe(full[i].row)
        expect(cell.col).toBe(full[i].col)
        if (cell.word) expect(cell.word.id).toBe(full[i].word?.id)
      })
    }
  })

  it('hidden words leave an empty place instead of shifting others', () => {
    const full = buildCoreBoard(WORDS, 3)
    const masked = buildCoreBoard(WORDS, 3, ['want'])
    const i = full.findIndex((c) => c.word?.id === 'want')
    expect(masked[i].word).toBeNull()
    masked.forEach((c, j) => j !== i && expect(c.word?.id).toBe(full[j].word?.id))
  })
})

describe('word prediction', () => {
  const vocab = ['suv', 'sut', 'shirinlik', 'shu yerda', 'olma', 'non']

  it('matches the word being typed by prefix, top 4', () => {
    expect(predict({ text: 's', vocab, history: [] })).toEqual(['suv', 'sut', 'shirinlik', 'shu'])
    expect(predict({ text: 'men SUV', vocab, history: [] })).toEqual([])
    expect(predict({ text: 'men SH', vocab, history: [] })).toEqual(['shirinlik', 'shu'])
    expect(predict({ text: 'x', vocab, history: [] })).toEqual([])
  })

  it('ranks the personal history first by frequency', () => {
    const history = ['sut', 'shirinlik', 'shirinlik', 'olma']
    expect(predict({ text: 's', vocab, history })).toEqual(['shirinlik', 'sut', 'suv', 'shu'])
  })

  it('offers the most used personal words when nothing is typed', () => {
    expect(predict({ text: 'men ', vocab, history: ['olma', 'non', 'olma'] })).toEqual(['olma', 'non'])
  })

  it('ignores apostrophe variants and does not repeat the exact word', () => {
    expect(predict({ text: 'o‘', vocab: ['oʻyna', 'olma'], history: [] })).toEqual(['oʻyna'])
    expect(predict({ text: 'suv', vocab, history: [] })).toEqual([])
  })

  it('replaces the partial word', () => {
    expect(currentPrefix('men su')).toBe('su')
    expect(applyPrediction('men su', 'suv')).toBe('men suv ')
    expect(applyPrediction('', 'salom')).toBe('salom ')
    expect(tokenize('он / она')).toEqual(['он', 'она'])
  })
})

describe('keyboard', () => {
  it('chooses the layout from the speech language and script', () => {
    expect(layoutFor('ru', 'cyrl')).toBe('ru')
    expect(layoutFor('uz', 'cyrl')).toBe('uz-cyrl')
    expect(layoutFor('uz', 'latn')).toBe('uz-latn')
    const flat = (id: keyof typeof LAYOUTS) => LAYOUTS[id].rows.flat().map((k) => k.insert)
    expect(flat('uz-latn')).toEqual(expect.arrayContaining(['o‘', 'g‘', '’']))
    expect(flat('uz-cyrl')).toEqual(expect.arrayContaining(['ў', 'қ', 'ғ', 'ҳ']))
  })

  it('offers a 2026 Latin layout (Ş Ç Ö Ğ, no ‘ keys) and digits / hyphen on every layout', () => {
    expect(layoutFor('uz', 'latn2026')).toBe('uz-latn26')
    const flat = (id: keyof typeof LAYOUTS) => LAYOUTS[id].rows.flat().map((k) => k.insert)
    expect(flat('uz-latn26')).toEqual(expect.arrayContaining(['ş', 'ç', 'ö', 'ğ']))
    expect(flat('uz-latn26').some((k) => k === 'o‘' || k === 'g‘')).toBe(false)
    for (const id of Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>) expect(flat(id), id).toEqual(expect.arrayContaining(['1', '0', '-']))
    expect(flat('uz-cyrl')).toEqual(expect.arrayContaining(['щ', 'ы']))
  })

  it('normalizes whatever was typed back to canonical Latin 1995 before speaking or predicting', () => {
    expect(latn2026ToLatn('şaftoli öğil çoy Ğalaba')).toBe('shaftoli oʻgʻil choy Gʻalaba')
    expect(toCanonicalUz('şaftoli öyin')).toBe('shaftoli oʻyin')
    expect(toCanonicalUz('o‘yin g‘isht ma’no')).toBe('oʻyin gʻisht maʼno')
    expect(toCanonicalUz('ўйин')).toBe('oʻyin')
    expect(toCanonicalUz('salom')).toBe('salom')
  })

  it('transliterates Uzbek Cyrillic to Latin for speech', () => {
    expect(uzCyrlToLatn('Салом')).toBe('Salom')
    expect(uzCyrlToLatn('ўйин')).toBe('oʻyin')
    expect(uzCyrlToLatn('ғишт')).toBe('gʻisht')
    expect(uzCyrlToLatn('ер келди')).toBe('yer keldi')
    expect(uzCyrlToLatn('маъно')).toBe('maʼno')
    expect(uzCyrlToLatn('Шаҳар')).toBe('Shahar')
  })
})

describe('core cell size', () => {
  it('fits width and height, never below 52 px', async () => {
    const { coreCellSize } = await import('./Boards')
    // 360 px phone portrait: width-limited, still ≥ 52 px.
    expect(coreCellSize(336, 420, 4, 72)).toBe(52)
    // Tablet: limited by the shorter side.
    expect(coreCellSize(700, 560, 8, 72)).toBe(86)
    // Phone landscape: rows cannot fit the height, so the panel scrolls with comfortable cells.
    expect(coreCellSize(700, 200, 6, 72)).toBe(72)
  })

  it('narrow cells grow taller than wide (room for a 13 px label), wide cells stay square', async () => {
    const { coreCellHeight } = await import('./Boards')
    // 390 px phone: spare panel height is used (up to 1.45x the width).
    expect(coreCellHeight(56, 430, 4)).toBe(68)
    // 360 px phone with a short panel: rows cannot fit, cells keep 1.4x and the panel scrolls.
    expect(coreCellHeight(51, 330, 4)).toBe(71)
    // Tablet and larger: square.
    expect(coreCellHeight(96, 700, 8)).toBe(96)
  })
})
