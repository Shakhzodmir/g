// @vitest-environment node
// Node environment like backup.test.ts: fake-indexeddb round-trips plain objects; the same database file is shared by the checks table.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { GapimizDB } from '../../store/db'
import { defaultProfile } from '../../store/profileTypes'
import { exportProfile, importBackup, parseBackup, wipeDatabase } from '../parent/backup'
import { addResult, emptyRow, latestResult, pruneTicks, sanitizeRow, toggleTick } from './model'
import { deleteRows, loadRows, putRow } from './repo'
import { buildResult } from './scoring'
import { adultQuestions } from './questions'
import { CHECK_CONFIG } from './config'
import type { Answer, CheckKind, CheckResult } from './types'

const dbs: GapimizDB[] = []
const freshDb = (): GapimizDB => {
  const d = new GapimizDB(`check-test-${Math.random().toString(36).slice(2)}`)
  dbs.push(d)
  return d
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

function result(ts: number, answer: Answer = 2, retest = false): CheckResult {
  const qs = adultQuestions()
  return buildResult({ ts, stage: 'full', age: null, concerns: [], retest, questions: qs, answers: Object.fromEntries(qs.map((q) => [q.id, answer])) })
}

describe('row model', () => {
  it('the first result starts a plan; a retest inside the plan keeps its start and refreshes the focus', () => {
    const r0 = addResult(emptyRow('p1', 'adult'), result(1000, 0))
    expect(r0.plan?.startedTs).toBe(1000)
    expect(r0.plan?.baselineResultId).toBe(r0.results[0].id)
    expect(r0.plan?.focus.length).toBe(CHECK_CONFIG.plan.maxFocus)
    const r1 = addResult(r0, result(2_000_000, 2, true))
    expect(r1.plan?.startedTs).toBe(1000)
    expect(r1.results).toHaveLength(2)
    expect(r1.plan?.focus).toHaveLength(CHECK_CONFIG.plan.whenAllGood)
    expect(latestResult(r1)?.ts).toBe(2_000_000)
  })
  it('a fresh start (not a retest) begins a new plan', () => {
    const r0 = addResult(emptyRow('p1', 'adult'), result(1000, 0))
    const r1 = addResult(r0, result(9000, 1, false))
    expect(r1.plan?.startedTs).toBe(9000)
  })
  it('a retest without a plan starts one', () => {
    expect(addResult(emptyRow('p1', 'adult'), result(5, 1, true)).plan?.startedTs).toBe(5)
  })
  it('keeps at most keepResults results', () => {
    let row = emptyRow('p1', 'adult')
    for (let i = 0; i < CHECK_CONFIG.keepResults + 5; i++) row = addResult(row, result(1000 + i, 2, i > 0))
    expect(row.results).toHaveLength(CHECK_CONFIG.keepResults)
    expect(row.results[row.results.length - 1].ts).toBe(1000 + CHECK_CONFIG.keepResults + 4)
  })
  it('toggles a tick on and off per day and prunes old days', () => {
    let row = emptyRow('p1', 'child')
    row = toggleTick(row, '2026-10-20', 'child.vocab.t1', 1)
    row = toggleTick(row, '2026-10-20', 'child.vocab.a1', 2)
    expect(row.ticks['2026-10-20']).toEqual(['child.vocab.t1', 'child.vocab.a1'])
    row = toggleTick(row, '2026-10-20', 'child.vocab.t1', 3)
    expect(row.ticks['2026-10-20']).toEqual(['child.vocab.a1'])
    row = toggleTick(row, '2026-10-20', 'child.vocab.a1', 4)
    expect(row.ticks['2026-10-20']).toBeUndefined()
    const many: Record<string, string[]> = {}
    for (let i = 0; i < CHECK_CONFIG.keepTickDays + 10; i++) many[`2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`] = ['x']
    expect(Object.keys(pruneTicks(many))).toHaveLength(CHECK_CONFIG.keepTickDays)
  })
})

describe('sanitizeRow (untrusted input)', () => {
  const good = () => {
    const row = addResult(emptyRow('p1', 'adult'), result(1000, 1))
    return toggleTick(row, '2026-10-20', 'adult.words.t1', 5)
  }
  it('round-trips a valid row and always uses the caller profile id', () => {
    const row = sanitizeRow(JSON.parse(JSON.stringify(good())), 'p-other')!
    expect(row.profileId).toBe('p-other')
    expect(row.id).toBe('p-other:adult')
    expect(row.results).toHaveLength(1)
    expect(row.results[0].overall).toBe('watch')
    expect(row.ticks['2026-10-20']).toEqual(['adult.words.t1'])
    expect(row.plan?.focus.length).toBeGreaterThan(0)
  })
  it('rejects rows of an unknown kind or shape', () => {
    expect(sanitizeRow(null, 'p')).toBeNull()
    expect(sanitizeRow({ kind: 'weird' }, 'p')).toBeNull()
    expect(sanitizeRow('x', 'p')).toBeNull()
  })
  it('drops hostile values', () => {
    const raw = JSON.parse(JSON.stringify(good()))
    raw.results[0].answers = { '__proto__': 2, 'ad.words.1': 7, 'ad.words.2': 1, ['x'.repeat(200)]: 2 }
    raw.results[0].bands = { words: 'bogus', hack: 'good', vocab: 'attention' }
    raw.results[0].id = '../../etc'
    raw.ticks = { '2026-10-20': ['ok.id', '<img onerror>', 5, '__proto__'], 'not-a-day': ['x'], '2026-02-31': ['x'] }
    raw.plan = { startedTs: 'now', baselineResultId: 'r', focus: [] }
    const row = sanitizeRow(raw, 'p')!
    expect(row.results).toEqual([]) // the only result had an unsafe id
    expect(row.ticks).toEqual({ '2026-10-20': ['ok.id'] })
    expect(row.plan).toBeNull()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    const raw2 = JSON.parse(JSON.stringify(good()))
    raw2.results[0].answers = { 'ad.words.1': 7, 'ad.words.2': 1 }
    raw2.results[0].bands = { words: 'bogus', hack: 'good', vocab: 'attention' }
    const r2 = sanitizeRow(raw2, 'p')!
    expect(r2.results[0].answers).toEqual({ 'ad.words.2': 1 })
    expect(Object.keys(r2.results[0].bands)).toEqual(['vocab'])
  })
  it('caps the number of results and ticks per day', () => {
    const raw = JSON.parse(JSON.stringify(good()))
    raw.results = Array.from({ length: 200 }, (_, i) => ({ ...raw.results[0], id: `r${i}`, ts: 1000 + i }))
    raw.ticks = { '2026-10-20': Array.from({ length: 50 }, (_, i) => `t${i}`) }
    const row = sanitizeRow(raw, 'p')!
    expect(row.results.length).toBeLessThanOrEqual(CHECK_CONFIG.keepResults)
    expect(row.ticks['2026-10-20'].length).toBeLessThanOrEqual(12)
  })
})

describe('checks table (Dexie v2)', () => {
  it('stores and loads rows per profile, separately per kind', async () => {
    const d = freshDb()
    await putRow(addResult(emptyRow('pa', 'adult'), result(1000)), d)
    await putRow(addResult(emptyRow('pa', 'child'), result(1000, 1)), d)
    await putRow(addResult(emptyRow('pb', 'adult'), result(1000, 0)), d)
    expect((await loadRows('pa', d)).map((r) => r.kind).sort()).toEqual(['adult', 'child'])
    expect((await loadRows('pb', d)).map((r) => r.results[0].overall)).toEqual(['attention'])
    expect(await loadRows('nobody', d)).toEqual([])
  })
  it('deleting one kind or every row of a profile leaves the others', async () => {
    const d = freshDb()
    for (const [p, k] of [['pa', 'adult'], ['pa', 'child'], ['pb', 'adult']] as Array<[string, CheckKind]>) await putRow(emptyRow(p, k), d)
    await deleteRows('pa', 'child', d)
    expect(await d.checks.count()).toBe(2)
    await deleteRows('pa', undefined, d)
    expect((await d.checks.toArray()).map((r) => r.id)).toEqual(['pb:adult'])
  })
  it('upgrades an existing version-1 database without losing its data', async () => {
    const name = `check-upgrade-${Math.random().toString(36).slice(2)}`
    const { default: Dexie } = await import('dexie')
    const old = new Dexie(name)
    old.version(1).stores({ profiles: 'id', cards: 'id, profileId', recordings: 'id, profileId', events: '++id, profileId, type, ts, [profileId+ts]', schedules: 'id, profileId', stickers: '++id, profileId, ts' })
    await old.table('profiles').put(defaultProfile({ id: 'p-old', name: 'Old' }))
    await old.table('events').add({ profileId: 'p-old', type: 'aac_word', ref: 'water', ts: 5 })
    old.close()
    const d = new GapimizDB(name)
    dbs.push(d)
    expect((await d.profiles.get('p-old'))?.name).toBe('Old')
    expect(await d.events.count()).toBe(1)
    expect(await d.checks.count()).toBe(0)
    await putRow(emptyRow('p-old', 'adult'), d)
    expect(await d.checks.count()).toBe(1)
  })
})

describe('backup / restore / wipe include the checks', () => {
  async function seed(d: GapimizDB) {
    const profile = defaultProfile({ id: 'p-aziz', name: 'Aziz', createdAt: 1 })
    await d.profiles.put(profile)
    await d.profiles.put(defaultProfile({ id: 'p-other', name: 'Other', createdAt: 2 }))
    let row = addResult(emptyRow('p-aziz', 'adult'), result(1000, 1))
    row = toggleTick(row, '2026-10-20', 'adult.words.t1', 5)
    await putRow(row, d)
    await putRow(addResult(emptyRow('p-other', 'adult'), result(2000, 0)), d)
    return profile
  }

  it('exports only this profile and restores through the sanitiser into another database', async () => {
    const src = freshDb()
    const profile = await seed(src)
    const backup = await exportProfile(profile, '0.1', src, 1)
    expect(backup.checks).toHaveLength(1)
    expect(backup.checks![0].profileId).toBe('p-aziz')
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.ignored.checks).toBe(0)
    const dst = freshDb()
    await importBackup(parsed.backup, dst, false)
    const rows = await loadRows('p-aziz', dst)
    expect(rows).toHaveLength(1)
    expect(rows[0].results[0].overall).toBe('watch')
    expect(rows[0].ticks['2026-10-20']).toEqual(['adult.words.t1'])
    expect(await dst.checks.count()).toBe(1)
  })

  it('importing replaces the checks of that profile and leaves other profiles alone', async () => {
    const src = freshDb()
    const backup = await exportProfile(await seed(src), '0.1', src, 1)
    const dst = freshDb()
    await seed(dst)
    await putRow(addResult(emptyRow('p-aziz', 'child'), result(3000, 2)), dst) // not in the backup: replaced away
    const parsed = parseBackup(JSON.stringify(backup))
    if (!parsed.ok) throw new Error('parse')
    await importBackup(parsed.backup, dst, false)
    expect((await loadRows('p-aziz', dst)).map((r) => r.kind)).toEqual(['adult'])
    expect((await loadRows('p-other', dst)).length).toBe(1)
  })

  it('a file from before the feature (no checks key) imports and keeps the checks already on the device', async () => {
    const dst = freshDb()
    await seed(dst)
    const old = { format: 'gapimiz-backup', version: 2, app: '0.1', exportedAt: 1, profile: defaultProfile({ id: 'p-aziz', name: 'Aziz' }), cards: [], recordings: [], schedules: [], stickers: [], events: [] }
    const parsed = parseBackup(JSON.stringify(old))
    if (!parsed.ok) throw new Error('parse')
    expect(parsed.backup.checks).toBeUndefined()
    await importBackup(parsed.backup, dst, false)
    expect(await loadRows('p-aziz', dst)).toHaveLength(1)
  })

  it('a hostile checks block is repaired or dropped and reported', () => {
    const base = { format: 'gapimiz-backup', version: 2, app: '0.1', exportedAt: 1, profile: defaultProfile({ id: 'p-x' }), cards: [], recordings: [], schedules: [], stickers: [], events: [] }
    const bad = parseBackup(JSON.stringify({ ...base, checks: [{ kind: 'adult', profileId: 'someone-else', results: [{ id: '../x', ts: 1 }], ticks: { '2026-10-20': ['a'] } }, 'junk', { kind: 'nope' }] }))
    expect(bad.ok).toBe(true)
    if (!bad.ok) return
    expect(bad.ignored.checks).toBe(2)
    expect(bad.backup.checks?.[0].profileId).toBe('p-x')
    expect(bad.backup.checks?.[0].results).toEqual([])
    const notArray = parseBackup(JSON.stringify({ ...base, checks: { evil: 1 } }))
    expect(notArray.ok && notArray.ignored.checks).toBe(1)
    expect(notArray.ok && notArray.backup.checks).toBeUndefined()
  })

  it('"erase everything" clears the checks table', async () => {
    const d = freshDb()
    await seed(d)
    await wipeDatabase(d)
    expect(await d.checks.count()).toBe(0)
  })
})
