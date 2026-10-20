import { describe, expect, it } from 'vitest'
import { ARTICULATION } from '../content/exercises'
import { PHRASES } from '../content/phrases'
import { topicsForKind } from '../content/topics'
import { wordsForKind } from '../content/vocab'
import { GAMES, gamesFor } from '../features/games/registry'
import type { EventRow, EventType } from '../store/db'
import { needsPoses, resolveResume, resumeOf } from './continue'
import { FEATURES } from './features'

let n = 0
const ev = (type: EventType, ref: string, meta?: Record<string, unknown>, ts = ++n * 1000): EventRow => ({ profileId: 'p', type, ref, ts, meta })

/** First word of a topic that this kind of profile can see. */
const wordOf = (topic: string, kind: 'child' | 'adult') => wordsForKind(kind).find((w) => w.topic === topic)!

describe('resolveResume', () => {
  it('has nothing to continue without history (the card stays hidden)', () => {
    expect(resolveResume([], 'child')).toBeNull()
    expect(resolveResume([], 'adult')).toBeNull()
    expect(resolveResume([ev('session_start', 'app')], 'child')).toBeNull()
  })

  it('a game round points back at the game, with its title, symbol and level', () => {
    const r = resolveResume([ev('game_round', 'syllables', { level: 2 })], 'child')!
    expect(r).toMatchObject({ kind: 'game', ref: 'syllables', to: '/games/syllables', symbol: 'drum', level: 2 })
    expect(r.title).toEqual({ uz: 'Chapak-chapak', ru: 'Хлоп-хлоп' })
  })

  it('adults see the adult title of a shared game', () => {
    expect(resolveResume([ev('game_round', 'syllables', { level: 1 })], 'adult')!.title).toEqual({ uz: 'Boʻgʻinlar', ru: 'Слоги' })
  })

  it('the newest event wins whatever order the rows come in', () => {
    const rows = [ev('game_round', 'find', {}, 3000), ev('game_round', 'memory', {}, 9000), ev('game_round', 'syllables', {}, 5000)]
    expect(resolveResume(rows, 'child')!.ref).toBe('memory')
    expect(resolveResume([...rows].reverse(), 'child')!.ref).toBe('memory')
  })

  it('a level outside 1..3 is dropped instead of shown', () => {
    expect(resolveResume([ev('game_round', 'find', { level: 9 })], 'child')!.level).toBeUndefined()
    expect(resolveResume([ev('game_round', 'find', { level: 'x' })], 'child')!.level).toBeUndefined()
  })

  describe('kind separation', () => {
    const childOnly = GAMES.filter((g) => g.audience === 'child')
    const adultOnly = GAMES.filter((g) => g.audience === 'adult')

    it('there are games of both kinds to test with', () => {
      expect(childOnly.length).toBeGreaterThan(3)
      expect(adultOnly.length).toBeGreaterThan(3)
    })

    it('an adult never resumes a child-only game, a child never an adult drill', () => {
      for (const g of childOnly) expect(resolveResume([ev('game_round', g.id)], 'adult'), g.id).toBeNull()
      for (const g of adultOnly) expect(resolveResume([ev('game_round', g.id)], 'child'), g.id).toBeNull()
    })

    it('an unusable newest event is skipped: the older one that fits is offered', () => {
      const rows = [ev('game_round', 'find', {}, 1000), ev('game_round', childOnly[0].id, {}, 9000)]
      expect(resolveResume(rows, 'adult')!.ref).toBe('find')
      expect(resolveResume(rows, 'child')!.ref).toBe(childOnly[0].id)
    })

    it('every game offered to a kind is also resumable by that kind', () => {
      for (const kind of ['child', 'adult'] as const) {
        for (const g of gamesFor(kind)) expect(resolveResume([ev('game_round', g.id)], kind)!.to, `${kind}/${g.id}`).toBe(`/games/${g.id}`)
      }
    })

    it('words of a child-only topic or of adult-only vocabulary do not cross over', () => {
      const toys = wordOf('toys', 'child')
      expect(topicsForKind('adult').some((t) => t.id === 'toys')).toBe(false)
      expect(resolveResume([ev('aac_word', toys.id)], 'adult')).toBeNull()
      const adultTopic = topicsForKind('adult').find((t) => t.audience === 'adult')!
      const adultWord = wordOf(adultTopic.id, 'adult')
      expect(wordsForKind('child').some((w) => w.id === adultWord.id)).toBe(false)
      expect(resolveResume([ev('aac_word', adultWord.id)], 'child')).toBeNull()
      expect(resolveResume([ev('aac_word', adultWord.id)], 'adult')!.to).toBe(`/talk?topic=${adultTopic.id}`)
    })
  })

  describe('routes that no longer exist', () => {
    it('a game that was removed is skipped', () => {
      const rows = [ev('game_round', 'find', {}, 1000), ev('game_round', 'ghost_game', {}, 9000)]
      expect(resolveResume(rows, 'child')!.ref).toBe('find')
      expect(resolveResume([ev('game_round', 'ghost_game')], 'child')).toBeNull()
    })
    it('an exercise, a word or a phrase that is gone is skipped', () => {
      expect(resolveResume([ev('exercise', 'ghost')], 'child')).toBeNull()
      expect(resolveResume([ev('aac_word', 'ghost_word')], 'child')).toBeNull()
      expect(resolveResume([ev('aac_phrase', 'ghost_phrase')], 'child')).toBeNull()
    })
  })

  describe('the talk board', () => {
    it('a word leads back to its topic, the core words to the core board', () => {
      const food = wordOf('food', 'child')
      expect(resolveResume([ev('aac_word', food.id)], 'child')).toMatchObject({ kind: 'talk', ref: 'food', to: '/talk?topic=food' })
      const core = wordsForKind('child').find((w) => w.topic === 'core')!
      expect(resolveResume([ev('aac_word', core.id)], 'child')).toMatchObject({ kind: 'talk', ref: 'core', to: '/talk' })
    })
    it('the topic name and symbol are the topic\'s own', () => {
      const r = resolveResume([ev('aac_word', wordOf('food', 'child').id)], 'child')!
      const def = topicsForKind('child').find((t) => t.id === 'food')!
      expect(r.title).toEqual({ uz: def.uz, ru: def.ru })
      expect(r.symbol).toBe(def.symbol)
    })
    it('modelling by an adult counts like a tap', () => {
      expect(resolveResume([ev('aac_model', wordOf('food', 'child').id)], 'child')!.to).toBe('/talk?topic=food')
    })
    it('a phrase leads to the ready phrases, the typed keyboard to the keyboard', () => {
      expect(resolveResume([ev('aac_phrase', PHRASES[0].id)], 'adult')!.to).toBe('/talk?mode=phrases')
      expect(resolveResume([ev('aac_speak', 'kb')], 'adult')!.to).toBe('/talk?mode=keyboard')
    })
    it('things that are not a board are ignored: message-bar sentences, feelings, helpers, own cards', () => {
      for (const row of [ev('aac_speak', 'bar'), ev('aac_phrase', 'feeling:happy'), ev('aac_phrase', 'helper:hug'), ev('aac_word', 'c.123')]) expect(resumeOf(row, 'child')).toBeNull()
    })
    it('every route it produces is a topic the screen knows', () => {
      for (const kind of ['child', 'adult'] as const) {
        const ids = new Set(topicsForKind(kind).map((t) => t.id))
        for (const w of wordsForKind(kind)) {
          const r = resumeOf(ev('aac_word', w.id), kind)
          if (!r) continue
          expect(ids.has(r.ref), `${kind}/${w.id}`).toBe(true)
        }
      }
    })
  })

  describe('exercises and the day', () => {
    it('breath and voice exercises, and the mirror poses', () => {
      expect(resolveResume([ev('exercise', 'blow')], 'child')).toMatchObject({ kind: 'exercise', to: '/exercises/blow', symbol: 'wind_face' })
      expect(resolveResume([ev('exercise', 'voice')], 'child')).toMatchObject({ to: '/exercises/voice', symbol: 'speaking_head' })
      expect(resolveResume([ev('exercise', 'voice')], 'adult')).toMatchObject({ to: '/exercises/voice', symbol: 'microphone', title: { uz: 'Ovoz', ru: 'Голос' } })
      const pose = ARTICULATION[0]
      expect(resolveResume([ev('exercise', pose.id)], 'child', ARTICULATION)).toMatchObject({ to: `/exercises/mirror/${pose.id}`, title: pose.title })
    })
    it('the pose data is only needed (and only loaded) when the history has a mirror exercise', () => {
      expect(needsPoses([ev('exercise', 'blow'), ev('game_round', 'find'), ev('exercise', 'voice')])).toBe(false)
      expect(needsPoses([ev('exercise', ARTICULATION[0].id)])).toBe(true)
      // without the data a mirror event is skipped, never shown half-empty: the older event wins
      const rows = [ev('game_round', 'find', {}, 1000), ev('exercise', ARTICULATION[0].id, {}, 9000)]
      expect(resolveResume(rows, 'child')!.ref).toBe('find')
      expect(resolveResume(rows, 'child', ARTICULATION)!.ref).toBe(ARTICULATION[0].id)
    })
    it('every mirror pose is resumable', () => {
      for (const a of ARTICULATION) expect(resolveResume([ev('exercise', a.id)], 'child', ARTICULATION)!.to).toBe(`/exercises/mirror/${a.id}`)
    })
    it('the day plan: a finished card leads back to the plan (adults see their plan title)', () => {
      expect(resolveResume([ev('schedule_done', 'water', { kind: 'day' })], 'child')).toMatchObject({ kind: 'day', to: '/day', title: FEATURES.schedule.title })
      expect(resolveResume([ev('schedule_done', 'water')], 'adult')!.title).toEqual({ uz: 'Reja', ru: 'План' })
    })
  })
})
