import { describe, expect, it } from 'vitest'
import { addDays, balancedPages, buildDiary, DIARY_DAYS, DIARY_ROWS_PER_PAGE, formatDayMonth, formatFullDate, parseIsoDate } from './diary'

describe('diary generator', () => {
  it('7, 14 and 30 days: the right number of rows, numbered from 1, and a sensible page split', () => {
    const shape = DIARY_DAYS.map((n) => buildDiary(n, null).map((p) => p.length))
    expect(shape).toEqual([[7], [14], [15, 15]])
    for (const n of DIARY_DAYS) {
      const rows = buildDiary(n, null).flat()
      expect(rows).toHaveLength(n)
      expect(rows.map((r) => r.n)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
      expect(rows.every((r) => r.date === null)).toBe(true)
    }
  })

  it('no page holds more rows than fit, and the last page is never a lone leftover', () => {
    for (const n of DIARY_DAYS) for (const per of [5, 8, 10, DIARY_ROWS_PER_PAGE, 20, 40]) {
      const pages = buildDiary(n, null, per)
      expect(Math.max(...pages.map((p) => p.length))).toBeLessThanOrEqual(per)
      expect(pages.flat()).toHaveLength(n)
      expect(Math.max(...pages.map((p) => p.length)) - Math.min(...pages.map((p) => p.length))).toBeLessThanOrEqual(1)
    }
    expect(balancedPages([1, 2, 3, 4, 5, 6, 7], 4).map((p) => p.length)).toEqual([4, 3])
    expect(balancedPages([], 5)).toEqual([])
  })

  it('with a start date every row has its date and weekday (Monday = 0)', () => {
    const rows = buildDiary(7, '2026-10-19').flat()
    expect(rows.map((r) => formatDayMonth(r.date!))).toEqual(['19.10', '20.10', '21.10', '22.10', '23.10', '24.10', '25.10'])
    expect(rows.map((r) => r.date!.dow)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('rolls over months, years and leap days', () => {
    const rows = buildDiary(7, '2025-12-29').flat()
    expect(rows.map((r) => formatFullDate(r.date!))).toEqual(['29.12.2025', '30.12.2025', '31.12.2025', '01.01.2026', '02.01.2026', '03.01.2026', '04.01.2026'])
    expect(formatFullDate(addDays(parseIsoDate('2028-02-28')!, 1))).toBe('29.02.2028')
    expect(formatFullDate(addDays(parseIsoDate('2027-02-28')!, 1))).toBe('01.03.2027')
    const thirty = buildDiary(30, '2026-01-31').flat()
    expect(formatFullDate(thirty[29].date!)).toBe('01.03.2026')
  })

  it('a daylight-saving change never skips or repeats a day', () => {
    // Europe moves clocks on 2026-03-29 and 2026-10-25; the calendar is computed in UTC
    const spring = buildDiary(14, '2026-03-22').flat().map((r) => formatDayMonth(r.date!))
    expect(new Set(spring).size).toBe(14)
    expect(spring[7]).toBe('29.03')
    const autumn = buildDiary(14, '2026-10-18').flat().map((r) => formatDayMonth(r.date!))
    expect(autumn[7]).toBe('25.10')
    expect(autumn[8]).toBe('26.10')
  })

  it('an invalid or missing start date leaves the date cells empty instead of throwing', () => {
    for (const bad of ['', null, undefined, 'abc', '2026-13-01', '2026-02-30', '2026-2-3', '31.12.2026', '0000-01-01']) {
      expect(buildDiary(7, bad).flat().every((r) => r.date === null), String(bad)).toBe(true)
    }
    expect(parseIsoDate(' 2026-02-28 ')).toEqual({ y: 2026, m: 2, d: 28, dow: 5 })
  })
})
