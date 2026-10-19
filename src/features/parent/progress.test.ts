import { describe, expect, it } from 'vitest'
import type { EventRow, EventType } from '../../store/db'
import {
  calendar,
  countBy,
  dayKey,
  feelingOf,
  pluralRu,
  sessionMinutes,
  sessions,
  startOfWeek,
  summarize,
  supportLines,
  windowStart,
} from './progress'

// Wednesday 14 Oct 2026, 12:00 local time.
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime()
const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min).getTime()
const ev = (type: EventType, ref: string, ts: number, meta?: Record<string, unknown>): EventRow => ({ profileId: 'p', type, ref, ts, meta })

describe('dates', () => {
  it('finds Monday of the week', () => {
    expect(dayKey(startOfWeek(NOW))).toBe('2026-10-12')
    expect(dayKey(startOfWeek(at(2026, 10, 18)))).toBe('2026-10-12') // Sunday belongs to the same week
    expect(dayKey(startOfWeek(at(2026, 10, 19)))).toBe('2026-10-19')
  })

  it('window covers 5 weeks ending with the current one', () => {
    expect(dayKey(windowStart(NOW))).toBe('2026-09-14')
  })

  it('builds a 5×7 calendar with counts, today and future days', () => {
    const cal = calendar([ev('aac_word', 'water', at(2026, 10, 13)), ev('aac_word', 'more', at(2026, 10, 13, 18))], NOW)
    expect(cal).toHaveLength(5)
    expect(cal.every((r) => r.length === 7)).toBe(true)
    expect(cal[0][0].key).toBe('2026-09-14')
    const lastWeek = cal[4]
    expect(lastWeek[1]).toMatchObject({ key: '2026-10-13', count: 2 })
    expect(lastWeek[2].isToday).toBe(true)
    expect(lastWeek[3].inFuture).toBe(true)
    expect(lastWeek[2].inFuture).toBe(false)
  })
})

describe('sessions', () => {
  it('splits on gaps longer than 10 minutes and credits at least one minute', () => {
    const s = sessions([
      ev('aac_word', 'a', at(2026, 10, 13, 10, 0)),
      ev('aac_word', 'b', at(2026, 10, 13, 10, 7)),
      ev('aac_word', 'c', at(2026, 10, 13, 10, 15)),
      ev('aac_word', 'd', at(2026, 10, 13, 11, 0)),
    ])
    expect(s).toHaveLength(2)
    expect(sessionMinutes(s[0])).toBe(15)
    expect(sessionMinutes(s[1])).toBe(1)
  })
})

describe('countBy', () => {
  it('sorts by frequency, then alphabetically', () => {
    const r = countBy([ev('aac_word', 'b', 1), ev('aac_word', 'a', 2), ev('aac_word', 'b', 3), ev('aac_word', 'c', 4)], (e) => e.ref)
    expect(r).toEqual([
      { ref: 'b', count: 2 },
      { ref: 'a', count: 1 },
      { ref: 'c', count: 1 },
    ])
  })
})

describe('feelingOf', () => {
  it('understands the possible logging conventions', () => {
    expect(feelingOf(ev('aac_word', 'f.happy', 1))).toBe('happy')
    expect(feelingOf(ev('aac_phrase', 'x', 1, { feeling: 'sad' }))).toBe('sad')
    expect(feelingOf(ev('aac_word', 'feeling:tired', 1))).toBe('tired')
    expect(feelingOf(ev('aac_word', 'water', 1))).toBeNull()
  })
})

describe('summarize', () => {
  it('reports an empty state when there is nothing in the window', () => {
    const s = summarize([ev('aac_word', 'water', at(2026, 1, 1))], NOW)
    expect(s.empty).toBe(true)
    expect(supportLines(s)).toEqual([])
  })

  it('aggregates words, new words, games, exercises and feelings', () => {
    const events = [
      // two weeks ago
      ev('aac_word', 'water', at(2026, 9, 29)),
      ev('aac_word', 'more', at(2026, 9, 29, 10, 1)),
      // this week
      ev('aac_word', 'water', at(2026, 10, 12, 9)),
      ev('aac_word', 'water', at(2026, 10, 12, 9, 2)),
      ev('aac_word', 'water', at(2026, 10, 13, 9)),
      ev('aac_word', 'apple', at(2026, 10, 13, 9, 1)),
      ev('aac_word', 'help', at(2026, 10, 13, 9, 3)),
      ev('aac_word', 'stop', at(2026, 10, 13, 9, 4), { modeling: true }),
      ev('aac_model', 'go', at(2026, 10, 13, 9, 5)),
      ev('aac_speak', 'water apple', at(2026, 10, 13, 9, 6)),
      ev('game_round', 'find', at(2026, 10, 14, 8)),
      ev('game_round', 'find', at(2026, 10, 14, 8, 3)),
      ev('exercise', 'smile', at(2026, 10, 14, 8, 5)),
      ev('aac_word', 'f.happy', at(2026, 10, 14, 8, 6)),
    ]
    const s = summarize(events, NOW)
    expect(s.empty).toBe(false)
    expect(s.weeks).toHaveLength(5)
    expect(s.weeks[2].activeDays).toBe(1)
    expect(s.thisWeek.activeDays).toBe(3)
    expect(s.thisWeek.sessions).toBe(3)
    expect(s.activeDays).toBe(4)
    expect(s.topWords[0]).toEqual({ ref: 'water', count: 4 })
    expect(s.topWords.find((w) => w.ref === 'stop')).toBeUndefined() // modelled by an adult
    expect(s.topWordThisWeek).toEqual({ ref: 'water', count: 3 })
    expect(s.newWords).toEqual(['apple', 'help', 'f.happy'])
    expect(s.games).toEqual([{ ref: 'find', count: 2 }])
    expect(s.exercises).toEqual([{ ref: 'smile', count: 1 }])
    expect(s.feelings).toEqual([{ ref: 'happy', count: 1 }])
    expect(s.thisWeek.spoken).toBe(1)

    const lines = supportLines(s).map((l) => l.id)
    expect(lines).toEqual(['topWord', 'newWords', 'spoken', 'feelings', 'exercises', 'days'])
    expect(supportLines(s)[0]).toMatchObject({ n: 3, refs: ['water'] })
  })

  it('is gentle when this week has no activity yet', () => {
    const s = summarize([ev('aac_word', 'water', at(2026, 9, 29))], NOW)
    expect(supportLines(s)).toEqual([{ id: 'gentle', n: 0, refs: [] }])
  })

  it('keeps a bounded candidate list (the screen shows 10 after hiding unnamed refs)', () => {
    const events = Array.from({ length: 60 }, (_, i) => ev('aac_word', `w${String(i).padStart(2, '0')}`, at(2026, 10, 13, 9, i)))
    expect(summarize(events, NOW).topWords).toHaveLength(40)
  })

  it('counts ready phrases in the most-chosen list too (P8), but not modelling or feelings', () => {
    const events = [
      ev('aac_phrase', 'help_me', at(2026, 10, 13, 9, 0)),
      ev('aac_phrase', 'help_me', at(2026, 10, 13, 9, 1)),
      ev('aac_word', 'water', at(2026, 10, 13, 9, 2)),
      ev('aac_phrase', 'feeling:happy', at(2026, 10, 13, 9, 3)),
      ev('aac_phrase', 'hug_me', at(2026, 10, 13, 9, 4), { model: true }),
      ev('aac_model', 'water', at(2026, 10, 13, 9, 5)),
    ]
    const s = summarize(events, NOW)
    expect(s.topWords).toEqual([
      { ref: 'help_me', count: 2 },
      { ref: 'water', count: 1 },
    ])
    expect(s.topWordThisWeek).toEqual({ ref: 'help_me', count: 2 })
  })
})

describe('pluralRu', () => {
  it('picks the right form', () => {
    const f = (n: number) => pluralRu(n, 'раз', 'раза', 'раз')
    expect([1, 2, 5, 11, 12, 21, 22, 25, 104].map(f)).toEqual(['раз', 'раза', 'раз', 'раз', 'раз', 'раз', 'раза', 'раз', 'раза'])
    expect(pluralRu(21, 'день', 'дня', 'дней')).toBe('день')
    expect(pluralRu(14, 'день', 'дня', 'дней')).toBe('дней')
  })
})

describe('canonical refs (P8)', () => {
  it('counts the same exercise or game logged under different spellings once', () => {
    const events = [
      ev('exercise', 'voice', at(2026, 10, 13, 9, 0)),
      ev('exercise', 'exercise:voice', at(2026, 10, 13, 9, 1)),
      ev('game_round', 'find', at(2026, 10, 13, 9, 2)),
      ev('game_round', 'game:find', at(2026, 10, 13, 9, 3)),
    ]
    const s = summarize(events, NOW)
    expect(s.exercises).toEqual([{ ref: 'voice', count: 2 }])
    expect(s.games).toEqual([{ ref: 'find', count: 2 }])
  })
})
