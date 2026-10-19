// @vitest-environment node
// Node environment: jsdom's Blob is not structured-cloneable, so fake-indexeddb would store it as {}; Node's native Blob round-trips like a browser's.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GapimizDB } from '../../store/db'
import { defaultProfile } from '../../store/profileTypes'
import { backupFileName, base64ToBytes, bytesToBase64, exportProfile, importBackup, parseBackup, wipeDatabase } from './backup'

const dbs: GapimizDB[] = []
function freshDb(): GapimizDB {
  const d = new GapimizDB(`backup-test-${Math.random().toString(36).slice(2)}`)
  dbs.push(d)
  return d
}

afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

async function bytesOf(b: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await b.arrayBuffer()))
}

async function seed(d: GapimizDB) {
  const profile = defaultProfile({ id: 'p-aziz', name: 'Aziz', speechLang: 'uz', createdAt: 1 })
  await d.profiles.put(profile)
  await d.profiles.put(defaultProfile({ id: 'p-other', name: 'Other', createdAt: 2 }))
  await d.cards.put({ id: 'card1', profileId: 'p-aziz', topic: 'food', fitz: 'thing', uz: 'Somsa', ru: 'Самса', image: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }), createdAt: 5 })
  await d.cards.put({ id: 'card2', profileId: 'p-aziz', topic: 'people', fitz: 'people', uz: 'Buvi', ru: 'Бабушка', image: null, createdAt: 6 })
  await d.recordings.put({ id: 'p-aziz:uz:w.water', profileId: 'p-aziz', targetKey: 'w.water', lang: 'uz', blob: new Blob([new Uint8Array([9, 8, 7])], { type: 'audio/webm' }), mime: 'audio/webm', createdAt: 7 })
  await d.schedules.put({ id: 's1', profileId: 'p-aziz', name: 'Ertalab', kind: 'day', items: [{ ref: 'c.card1', done: false }], updatedAt: 8 })
  await d.stickers.add({ profileId: 'p-aziz', stickerId: 'star', ts: 9 })
  await d.events.bulkAdd([
    { profileId: 'p-aziz', type: 'aac_word', ref: 'water', ts: 10 },
    { profileId: 'p-aziz', type: 'game_round', ref: 'find', ts: 11, meta: { ok: true } },
    { profileId: 'p-other', type: 'aac_word', ref: 'more', ts: 12 },
  ])
  return profile
}

describe('backup', () => {
  it('base64 round-trips binary data', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 37) % 256)
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes))
  })

  it('round-trips a profile with blobs through JSON into another database', async () => {
    const src = freshDb()
    const profile = await seed(src)
    const backup = await exportProfile(profile, '0.1', src, 1000)
    expect(backup.cards).toHaveLength(2)
    expect(backup.events).toHaveLength(2) // only this profile
    expect(backup.events[0]).not.toHaveProperty('id')

    const text = JSON.stringify(backup)
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const dst = freshDb()
    await dst.events.add({ profileId: 'p-aziz', type: 'aac_word', ref: 'stale', ts: 1 }) // replaced by the import
    const restored = await importBackup(parsed.backup, dst)
    expect(restored.name).toBe('Aziz')

    expect((await dst.profiles.get('p-aziz'))?.name).toBe('Aziz')
    const card = await dst.cards.get('card1')
    expect(card?.uz).toBe('Somsa')
    expect(card?.image).toBeTruthy()
    expect(await bytesOf(card!.image!)).toEqual([1, 2, 3, 250])
    expect(card!.image!.type).toBe('image/jpeg')
    expect((await dst.cards.get('card2'))?.image).toBeNull()
    const rec = await dst.recordings.get('p-aziz:uz:w.water')
    expect(await bytesOf(rec!.blob)).toEqual([9, 8, 7])
    expect((await dst.schedules.get('s1'))?.items[0].ref).toBe('c.card1')
    expect(await dst.stickers.where('profileId').equals('p-aziz').count()).toBe(1)
    const events = await dst.events.where('profileId').equals('p-aziz').sortBy('ts')
    expect(events.map((e) => e.ref)).toEqual(['water', 'find'])
    expect(events[1].meta).toEqual({ ok: true })
  })

  it('importing twice does not duplicate rows', async () => {
    const src = freshDb()
    const backup = await exportProfile(await seed(src), '0.1', src)
    const dst = freshDb()
    await importBackup(backup, dst)
    await importBackup(backup, dst)
    expect(await dst.events.count()).toBe(2)
    expect(await dst.stickers.count()).toBe(1)
  })

  it('rejects foreign, broken and newer files', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'invalid' })
    expect(parseBackup(JSON.stringify({ hello: 1 }))).toEqual({ ok: false, error: 'invalid' })
    const base = { format: 'gapimiz-backup', version: 1, app: '0.1', exportedAt: 1, profile: defaultProfile({ id: 'x' }), cards: [], recordings: [], schedules: [], stickers: [], events: [] }
    expect(parseBackup(JSON.stringify(base)).ok).toBe(true)
    expect(parseBackup(JSON.stringify({ ...base, version: 99 }))).toEqual({ ok: false, error: 'newer' })
    expect(parseBackup(JSON.stringify({ ...base, cards: [{ id: 'c', image: 'oops' }] }))).toEqual({ ok: false, error: 'invalid' })
    expect(parseBackup(JSON.stringify({ ...base, profile: { id: '' } }))).toEqual({ ok: false, error: 'invalid' })
  })

  it('wipes everything', async () => {
    const d = freshDb()
    await seed(d)
    await wipeDatabase(d)
    expect(await d.profiles.count()).toBe(0)
    expect(await d.events.count()).toBe(0)
    expect(await d.cards.count()).toBe(0)
  })

  it('builds an ASCII file name', () => {
    expect(backupFileName({ id: 'p', name: 'Aziz Karimov' }, new Date(2026, 9, 19).getTime())).toBe('gapimiz-aziz-karimov-2026-10-19.gapimiz')
    expect(backupFileName({ id: 'p', name: 'Азиз' }, new Date(2026, 9, 19).getTime())).toBe('gapimiz-profil-2026-10-19.gapimiz')
  })
})
