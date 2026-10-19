// @vitest-environment node
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { useDevice } from '../../store/device'
import { GapimizDB } from '../../store/db'
import { defaultProfile } from '../../store/profileTypes'
import { useExerciseSettings } from '../exercises/settings'
import { getTimerPrefs, useTimerStore } from '../timer/store'
import { useTokenStore } from '../tokens/store'
import { exportProfile, importBackup, LIMITS, parseBackup, type Backup } from './backup'
import { collectDevice } from './deviceBlock'

const dbs: GapimizDB[] = []
function freshDb(): GapimizDB {
  const d = new GapimizDB(`hostile-test-${Math.random().toString(36).slice(2)}`)
  dbs.push(d)
  return d
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

const base = (): Record<string, unknown> => ({
  format: 'gapimiz-backup',
  version: 2,
  app: '0.1',
  exportedAt: 1,
  profile: defaultProfile({ id: 'p-x', name: 'X' }),
  cards: [],
  recordings: [],
  schedules: [],
  stickers: [],
  events: [],
})
const parse = (o: unknown) => parseBackup(JSON.stringify(o))
const AUDIO = { mime: 'audio/webm', data: 'AAAA' }

describe('hostile backup files (P2)', () => {
  it('clamps and repairs hostile profile settings instead of storing them', () => {
    const b = base()
    b.profile = {
      ...(b.profile as object),
      voice: { rate: 'x', volume: 99, sfxVolume: -4, preferSystem: 'yes' },
      theme: 'nonexistent',
      aac: { level: 9, hiddenWordIds: ['a', 5, null, 'x'.repeat(500)] },
      name: 'N'.repeat(5000),
      avatar: '../../etc',
      touch: { holdMs: 1e9, dwellMs: 'a' },
    }
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const p = r.backup.profile
    expect(typeof p.voice.rate).toBe('number')
    expect(p.voice.rate).toBeGreaterThanOrEqual(0.6)
    expect(p.voice.rate).toBeLessThanOrEqual(1.4)
    expect(p.voice.volume).toBe(1)
    expect(p.voice.sfxVolume).toBe(0)
    expect(p.voice.preferSystem).toBe(false)
    expect(p.theme).toBe('bolajon')
    expect(p.aac.level).toBe(2)
    expect(p.aac.hiddenWordIds.length).toBeLessThanOrEqual(2)
    expect(p.aac.hiddenWordIds).toContain('a')
    expect(Array.from(p.name).length).toBe(30)
    expect(p.avatar).toBe('musicha')
    expect(p.touch.holdMs).toBe(1500)
    expect(p.touch.dwellMs).toBe(0)
    // the person is told what was corrected
    expect(r.ignored.settings).toEqual(expect.arrayContaining(['voice.rate', 'theme', 'aac.level', 'name', 'avatar', 'touch.holdMs']))
  })

  it.each(['__proto__', 'constructor', 'prototype', '', '../x', 'a b', 'x'.repeat(200)])('rejects profile id %j', (id) => {
    const b = base()
    b.profile = { ...(b.profile as object), id }
    expect(parse(b)).toEqual({ ok: false, error: 'invalid' })
  })

  it('does not let a JSON "__proto__" key pollute anything', () => {
    const text =
      '{"format":"gapimiz-backup","version":2,"profile":{"id":"p-x","kind":"child","__proto__":{"polluted":true}},"cards":[],"recordings":[],"schedules":[],"stickers":[],"events":[],"__proto__":{"polluted":true}}'
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    if (r.ok) expect(Object.prototype.hasOwnProperty.call(r.backup.profile, 'polluted')).toBe(false)
  })

  it('drops cards with bad ids, broken photos and no label; repairs enums', () => {
    const b = base()
    b.cards = [
      { id: '__proto__', uz: 'a' },
      { id: 'ok1', uz: 'Olma', ru: 'Яблоко', topic: 'food', fitz: 'thing', image: { mime: 'image/png', data: 'AAAA' } },
      { id: 'ok2', uz: 'Qalam', topic: 'nope', fitz: 'rainbow' },
      { id: 'bad-img', uz: 'x', image: { mime: 'text/html', data: 'AAAA' } },
      { id: 'bad-b64', uz: 'x', image: { mime: 'image/png', data: '***' } },
      { id: 'blank', uz: '​​', ru: '   ' },
      { id: 'ok1', uz: 'dup' },
      { id: 'huge', uz: 'x', image: { mime: 'image/png', data: 'A'.repeat(LIMITS.imageBase64 + 4) } },
      'string',
      null,
    ]
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.cards.map((c) => c.id)).toEqual(['ok1', 'ok2'])
    const [c1, c2] = r.backup.cards
    expect(c1.topic).toBe('food')
    expect(c2.topic).toBe('core')
    expect(c2.fitz).toBe('misc') // the core topic's default colour
    expect(c2.ru).toBe('Qalam') // the empty label is filled with the same text
    expect(r.ignored.cards).toBe(8)
  })

  it('enforces string limits and strips nested event metadata', () => {
    const b = base()
    b.cards = [{ id: 'c1', uz: 'U'.repeat(500), ru: 'R'.repeat(500) }]
    b.events = Array.from({ length: 5 }, (_, i) => ({ type: 'aac_word', ref: 'r'.repeat(i === 0 ? 500 : 5), ts: 1000 + i, meta: { s: 'm'.repeat(5000), nested: { a: 1 } } }))
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Array.from(r.backup.cards[0].uz).length).toBe(40)
    expect(r.backup.events).toHaveLength(4) // the 500-char ref is dropped
    expect((r.backup.events[0].meta as { s: string }).s.length).toBe(200)
    expect(r.backup.events[0].meta).not.toHaveProperty('nested')
  })

  it('rejects events of unknown type or with bad timestamps', () => {
    const b = base()
    b.events = [
      { type: 'hack', ref: 'x', ts: 1 },
      { type: 'aac_word', ref: 'x', ts: 'now' },
      { type: 'aac_word', ref: 'x', ts: -5 },
      { type: 'aac_word', ref: 'x', ts: Number.NaN },
      { type: 'aac_word', ref: 'water', ts: 5 },
    ]
    const r = parse(b)
    expect(r.ok && r.backup.events.map((e) => e.ref)).toEqual(['water'])
    expect(r.ok && r.ignored.events).toBe(4)
  })

  it('rebuilds recording and schedule ids from the profile so they cannot target another profile', () => {
    const b = base()
    b.recordings = [
      { id: 'victim:uz:w.water', profileId: 'victim', targetKey: 'w.water', lang: 'uz', blob: AUDIO, createdAt: 1 },
      { id: 'x', targetKey: '__proto__', lang: 'uz', blob: AUDIO },
      { id: 'y', targetKey: 'w.ok', lang: 'fr', blob: AUDIO },
      { id: 'z', targetKey: 'w.ok', lang: 'ru', blob: { mime: 'text/html', data: 'AAAA' } },
    ]
    b.schedules = [
      { id: 'victim:day', profileId: 'victim', kind: 'day', name: 'D', items: [{ ref: 'wake_up', done: 1 }, { ref: '<script>' }], updatedAt: 1 },
      { id: 'q', kind: 'weird', items: [] },
    ]
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.recordings.map((x) => [x.id, x.profileId])).toEqual([['p-x:uz:w.water', 'p-x']])
    expect(r.backup.schedules).toHaveLength(1)
    expect(r.backup.schedules[0]).toMatchObject({ id: 'p-x:day', profileId: 'p-x', items: [{ ref: 'wake_up', done: false }] })
    expect(r.ignored.recordings).toBe(3)
    expect(r.ignored.schedules).toBe(1)
  })

  it('refuses oversized, malformed and newer files', () => {
    expect(parseBackup('x'.repeat(LIMITS.fileChars + 1))).toEqual({ ok: false, error: 'tooBig' })
    expect(parse({ ...base(), version: 'two' })).toEqual({ ok: false, error: 'invalid' })
    expect(parse({ ...base(), version: 3 })).toEqual({ ok: false, error: 'newer' })
    expect(parse({ ...base(), cards: {} })).toEqual({ ok: false, error: 'invalid' })
    expect(parse([])).toEqual({ ok: false, error: 'invalid' })
    expect(parse(null)).toEqual({ ok: false, error: 'invalid' })
  })

  it('a hostile import never overwrites another profile on the device', async () => {
    const d = freshDb()
    await d.profiles.put(defaultProfile({ id: 'victim', name: 'Victim' }))
    await d.cards.put({ id: 'shared-id', profileId: 'victim', topic: 'food', fitz: 'thing', uz: 'Mine', ru: 'Моё', image: null, createdAt: 1 })
    await d.recordings.put({ id: 'victim:uz:c.shared-id', profileId: 'victim', targetKey: 'c.shared-id', lang: 'uz', blob: new Blob([new Uint8Array([1])]), mime: 'audio/webm', createdAt: 1 })
    const b = base()
    b.cards = [{ id: 'shared-id', uz: 'Evil', ru: 'Зло' }]
    b.recordings = [{ id: 'victim:uz:c.shared-id', targetKey: 'c.shared-id', lang: 'uz', blob: AUDIO }]
    b.schedules = [{ kind: 'day', name: 'x', items: [{ ref: 'c.shared-id', done: false }], updatedAt: 1 }]
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    await importBackup(r.backup, d, false)
    expect((await d.cards.get('shared-id'))?.uz).toBe('Mine')
    expect((await d.cards.get('shared-id'))?.profileId).toBe('victim')
    expect(await d.recordings.get('victim:uz:c.shared-id')).toMatchObject({ profileId: 'victim', targetKey: 'c.shared-id' })
    const mine = await d.cards.where('profileId').equals('p-x').toArray()
    expect(mine).toHaveLength(1)
    expect(mine[0].id).not.toBe('shared-id')
    expect(mine[0].uz).toBe('Evil')
    const sched = await d.schedules.get('p-x:day')
    expect(sched?.items[0].ref).toBe(`c.${mine[0].id}`)
    expect(await d.recordings.get(`p-x:uz:c.${mine[0].id}`)).toBeTruthy()
  })

  it('restores a hand-damaged profile as a valid one (Settings must not crash on it)', async () => {
    const b = base()
    b.profile = { ...(b.profile as object), voice: { rate: 'x' }, theme: 'nonexistent', aac: { level: 9 } }
    const r = parse(b)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = freshDb()
    await importBackup(r.backup, d, false)
    const stored = await d.profiles.get('p-x')
    expect(typeof stored?.voice.rate).toBe('number')
    expect(stored?.voice.rate.toFixed(1)).toBe('1.0')
    expect(stored?.theme).toBe('bolajon')
  })
})

describe('device block in the backup (P10)', () => {
  it('exports token board, timer, exercise settings and UI language, but never the PIN', async () => {
    const d = freshDb()
    const profile = defaultProfile({ id: 'p-aziz', name: 'Aziz' })
    await d.profiles.put(profile)
    useDevice.setState({ uiLang: 'ru', uzScript: 'latn', boardMode: false, parentPinHash: 'SECRETHASH' })
    useTokenStore.getState().setBoard('p-aziz', { goal: 7, count: 3, rewardRef: 'st.anor' })
    useTimerStore.getState().patch('p-aziz', { minutes: 10, showDigits: true, nextRef: 'lunch' })
    useExerciseSettings.getState().set({ blowSensitivity: 8, voiceSensitivity: 3, mirrorThreshold: 0.4, blowScene: 'boat' })
    const backup = await exportProfile(profile, '0.1', d, 1)
    expect(backup.version).toBe(2)
    expect(backup.device?.ui.uiLang).toBe('ru')
    expect(backup.device?.tokens.board).toEqual({ goal: 7, count: 3, rewardRef: 'st.anor' })
    expect(backup.device?.timer).toEqual({ minutes: 10, showDigits: true, nextRef: 'lunch' })
    expect(backup.device?.exercises).toMatchObject({ blowSensitivity: 8, blowScene: 'boat' })
    expect(JSON.stringify(backup)).not.toContain('SECRETHASH')
    expect(JSON.stringify(backup)).not.toContain('parentPinHash')
    expect(JSON.stringify(collectDevice('p-aziz'))).not.toContain('SECRETHASH')
    useDevice.setState({ uiLang: 'uz', parentPinHash: null })
  })

  it('restores the device block (sanitized) and leaves PIN, onboarding and active profile alone', async () => {
    const d = freshDb()
    useDevice.setState({ uiLang: 'uz', uzScript: 'latn', onboarded: true, activeProfileId: 'keep-me', parentPinHash: 'KEEPPIN' })
    useTokenStore.setState({ boards: {} })
    const parsed = parse({
      ...base(),
      profile: { id: 'p-new', kind: 'child' },
      device: {
        ui: { uiLang: 'uzc', uzScript: 'latn', boardMode: false, boardCalibration: { diagonalIn: 9999, scale: 'big' }, parentPinHash: 'EVIL' },
        tokens: { board: { goal: 99, count: -4, rewardRef: '<img onerror>' } },
        timer: { minutes: 9999, showDigits: 'yes', nextRef: null },
        exercises: { blowSensitivity: 55, voiceSensitivity: 'x', mirrorThreshold: 5, blowScene: 'lava' },
        gameLevels: { find: 2, memory: 9, hack: 3 },
      },
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const result = await importBackup(parsed.backup, d)
    expect(result.deviceRestored).toBe(true)
    const dev = useDevice.getState()
    expect(dev.uiLang).toBe('uzc')
    expect(dev.uzScript).toBe('cyrl') // derived from the language, never inconsistent
    expect(dev.parentPinHash).toBe('KEEPPIN')
    expect(dev.onboarded).toBe(true)
    expect(dev.activeProfileId).toBe('keep-me')
    expect(useTokenStore.getState().boards['p-new']).toEqual({ goal: 10, count: 0, rewardRef: null })
    expect(getTimerPrefs('p-new')).toEqual({ minutes: 60, showDigits: null, nextRef: null })
    expect(useTimerStore.getState().slots['p-new'].timer.status).toBe('idle')
    const ex = useExerciseSettings.getState()
    expect(ex.blowSensitivity).toBe(10)
    expect(ex.voiceSensitivity).toBe(5)
    expect(ex.mirrorThreshold).toBe(0.6)
    expect(ex.blowScene).toBe('candles')
    expect(dev.boardCalibration?.diagonalIn).toBe(120)
    useDevice.setState({ uiLang: 'uz', uzScript: 'latn', parentPinHash: null, boardCalibration: null, onboarded: false, activeProfileId: null })
  })

  it('a version-1 file (no device block) still imports', () => {
    const b: Backup = { format: 'gapimiz-backup', version: 1, app: '0.1', exportedAt: 1, profile: defaultProfile({ id: 'x' }), cards: [], recordings: [], schedules: [], stickers: [], events: [] }
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok && r.backup.device).toBeUndefined()
  })
})
