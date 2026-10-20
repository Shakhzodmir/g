import { TOPICS } from '../../content/topics'
import type { TopicId } from '../../content/types'
import { normalizeUz } from '../../i18n/orthography'
import { db as defaultDb, type CustomCard, type EventRow, type EventType, type GapimizDB, type Recording, type ScheduleItem, type ScheduleRow, type StickerRow } from '../../store/db'
import { defaultProfile, sanitizeProfile, type Profile } from '../../store/profileTypes'
import { sanitizeRow } from '../check/model'
import type { CheckRow } from '../check/types'
import { applyDevice, collectDevice, sanitizeDevice, type DeviceBlock } from './deviceBlock'
import { asciiSlug, cleanName, cleanText, FITZ, isSafeId, MAX_LABEL_LEN } from './model'

/*
 * `.gapimiz` backup: one JSON file with everything that belongs to a profile. Blobs (card photos, voice
 * recordings) are embedded as base64 so the file is self-contained and works offline. Version 2 adds a
 * `device` block (token board, timer, game levels, exercise settings, UI language, board mode; never the PIN).
 *
 * A backup file is untrusted input: parseBackup() rebuilds every row from known, validated fields, so nothing
 * the file contains (unknown keys, wrong types, huge strings, prototype-polluting ids) reaches the database.
 */

export const BACKUP_FORMAT = 'gapimiz-backup'
export const BACKUP_VERSION = 2
export const BACKUP_EXT = '.gapimiz'

/** Hard limits for an imported file. */
export const LIMITS = {
  fileChars: 80_000_000,
  cards: 1000,
  recordings: 2000,
  schedules: 50,
  stickers: 2000,
  events: 100_000,
  /** Rows examined in the `checks` array (there are three screenings per profile). */
  checks: 12,
  imageBase64: 4_000_000,
  audioBase64: 3_000_000,
  scheduleItems: 60,
  hiddenWordIds: 500,
} as const

export interface EncodedBlob {
  mime: string
  data: string
}

export type BackupCard = Omit<CustomCard, 'image'> & { image: EncodedBlob | null }
export type BackupRecording = Omit<Recording, 'blob'> & { blob: EncodedBlob }

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  app: string
  exportedAt: number
  profile: Profile
  cards: BackupCard[]
  recordings: BackupRecording[]
  schedules: ScheduleRow[]
  stickers: Array<Omit<StickerRow, 'id'>>
  events: Array<Omit<EventRow, 'id'>>
  /** Speech / communication checks (results, plan, ticks). Optional: files from before the feature have none. */
  checks?: CheckRow[]
  device?: DeviceBlock
}

/** What parseBackup() corrected or dropped, so the person can be told instead of silently losing data. */
export interface IgnoredReport {
  cards: number
  recordings: number
  schedules: number
  stickers: number
  events: number
  checks: number
  /** Names of profile settings that were invalid and replaced by defaults/clamped values (e.g. `voice.rate`). */
  settings: string[]
  /** The `device` block was present but unusable. */
  device: boolean
}

export function ignoredTotal(r: IgnoredReport): number {
  return r.cards + r.recordings + r.schedules + r.stickers + r.events + r.checks + r.settings.length + (r.device ? 1 : 0)
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer())
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer))
    r.onerror = () => reject(r.error)
    r.readAsArrayBuffer(blob)
  })
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function encodeBlob(blob: Blob): Promise<EncodedBlob> {
  return { mime: blob.type || 'application/octet-stream', data: bytesToBase64(await blobBytes(blob)) }
}

export function decodeBlob(e: EncodedBlob): Blob {
  return new Blob([base64ToBytes(e.data)], { type: e.mime })
}

function stripId<T extends { id?: number }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row
  void _id
  return rest
}

/** Collects every row of one profile (the profile object itself comes from the store: it is the freshest copy). */
export async function exportProfile(profile: Profile, appVersion: string, database: GapimizDB = defaultDb, now = Date.now(), withDevice = true): Promise<Backup> {
  const pid = profile.id
  const [cards, recordings, schedules, stickers, events, checks] = await Promise.all([
    database.cards.where('profileId').equals(pid).toArray(),
    database.recordings.where('profileId').equals(pid).toArray(),
    database.schedules.where('profileId').equals(pid).toArray(),
    database.stickers.where('profileId').equals(pid).toArray(),
    database.events.where('profileId').equals(pid).toArray(),
    database.checks.where('profileId').equals(pid).toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: appVersion,
    exportedAt: now,
    profile,
    cards: await Promise.all(cards.map(async (c) => ({ ...c, image: c.image ? await encodeBlob(c.image) : null }))),
    recordings: await Promise.all(recordings.map(async (r) => ({ ...r, blob: await encodeBlob(r.blob) }))),
    schedules,
    stickers: stickers.map(stripId),
    events: events.map(stripId),
    checks,
    ...(withDevice ? { device: collectDevice(pid) } : {}),
  }
}

export type ParseError = 'invalid' | 'newer' | 'tooBig'
export type ParseResult = { ok: true; backup: Backup; ignored: IgnoredReport } | { ok: false; error: ParseError }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finiteTs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 8.64e15
const B64 = /^[A-Za-z0-9+/]*={0,2}$/
const IMAGE_MIME = /^image\/(jpeg|png|webp|gif|avif)$/i
const AUDIO_MIME = /^audio\/[A-Za-z0-9.+-]+(;[A-Za-z0-9=.," +-]{0,60})?$/i
const TOPIC_IDS = new Set<string>(TOPICS.map((t) => t.id))
const EVENT_TYPES: readonly EventType[] = ['aac_word', 'aac_phrase', 'aac_speak', 'aac_model', 'game_round', 'exercise', 'session_start', 'schedule_done']
const REF = /^[\w.:-]{1,80}$/

function sanitizeBlob(v: unknown, kind: 'image' | 'audio'): EncodedBlob | null {
  if (!isObj(v) || typeof v.data !== 'string' || typeof v.mime !== 'string') return null
  if (!(kind === 'image' ? IMAGE_MIME : AUDIO_MIME).test(v.mime) || v.mime.length > 80) return null
  if (v.data.length === 0 || v.data.length > (kind === 'image' ? LIMITS.imageBase64 : LIMITS.audioBase64) || v.data.length % 4 !== 0 || !B64.test(v.data)) return null
  return { mime: v.mime, data: v.data }
}

function sanitizeCard(raw: unknown, pid: string): BackupCard | null {
  if (!isObj(raw) || !isSafeId(raw.id)) return null
  const uz = normalizeUz(cleanText(raw.uz, MAX_LABEL_LEN))
  const ru = cleanText(raw.ru, MAX_LABEL_LEN)
  if (!uz && !ru) return null
  let image: EncodedBlob | null = null
  if (raw.image != null) {
    image = sanitizeBlob(raw.image, 'image')
    if (!image) return null // a broken photo makes the whole card unreliable: drop it rather than show a blank tile
  }
  const topic = (typeof raw.topic === 'string' && TOPIC_IDS.has(raw.topic) ? raw.topic : 'core') as TopicId
  const fitz = typeof raw.fitz === 'string' && (FITZ as string[]).includes(raw.fitz) ? (raw.fitz as CustomCard['fitz']) : (TOPICS.find((t) => t.id === topic)?.fitz ?? 'thing')
  const symbol = typeof raw.symbol === 'string' && /^[a-z0-9_]{1,60}$/.test(raw.symbol) ? raw.symbol : undefined
  return {
    id: raw.id,
    profileId: pid,
    topic,
    fitz,
    uz: uz || ru,
    ru: ru || uz,
    image,
    ...(symbol ? { symbol } : {}),
    hidden: raw.hidden === true,
    createdAt: finiteTs(raw.createdAt) ? raw.createdAt : 0,
  }
}

function sanitizeRecording(raw: unknown, pid: string): BackupRecording | null {
  if (!isObj(raw) || (raw.lang !== 'uz' && raw.lang !== 'ru')) return null
  const targetKey = typeof raw.targetKey === 'string' ? raw.targetKey : ''
  if (!/^[\w.-]{1,100}$/.test(targetKey) || targetKey.split('.').some((p) => p === '__proto__' || p === 'constructor' || p === 'prototype')) return null
  const blob = sanitizeBlob(raw.blob, 'audio')
  if (!blob) return null
  return { id: `${pid}:${raw.lang}:${targetKey}`, profileId: pid, targetKey, lang: raw.lang, blob, mime: blob.mime, createdAt: finiteTs(raw.createdAt) ? raw.createdAt : 0 }
}

function sanitizeSchedule(raw: unknown, pid: string): ScheduleRow | null {
  if (!isObj(raw) || (raw.kind !== 'day' && raw.kind !== 'first-then') || !Array.isArray(raw.items)) return null
  const items: ScheduleItem[] = []
  for (const it of raw.items.slice(0, LIMITS.scheduleItems)) {
    if (isObj(it) && typeof it.ref === 'string' && REF.test(it.ref)) items.push({ ref: it.ref, done: it.done === true })
  }
  return { id: `${pid}:${raw.kind}`, profileId: pid, name: cleanText(raw.name, 60) || raw.kind, kind: raw.kind, items, updatedAt: finiteTs(raw.updatedAt) ? raw.updatedAt : 0 }
}

function sanitizeMeta(raw: unknown): Record<string, unknown> | undefined {
  if (!isObj(raw)) return undefined
  const out: Record<string, unknown> = {}
  let n = 0
  for (const [k, v] of Object.entries(raw)) {
    if (++n > 12) break
    if (!/^\w{1,24}$/.test(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    if (typeof v === 'string') out[k] = v.slice(0, 200)
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'boolean') out[k] = v
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x))).slice(0, 40).map((x) => (typeof x === 'string' ? x.slice(0, 80) : x))
  }
  return Object.keys(out).length ? out : undefined
}

function sanitizeEvent(raw: unknown, pid: string): Omit<EventRow, 'id'> | null {
  if (!isObj(raw) || !finiteTs(raw.ts) || typeof raw.type !== 'string' || !(EVENT_TYPES as readonly string[]).includes(raw.type)) return null
  if (typeof raw.ref !== 'string' || raw.ref.length === 0 || raw.ref.length > 120) return null
  const meta = sanitizeMeta(raw.meta)
  return { profileId: pid, type: raw.type as EventType, ref: raw.ref, ts: raw.ts, ...(meta ? { meta } : {}) }
}

function sanitizeSticker(raw: unknown, pid: string): Omit<StickerRow, 'id'> | null {
  if (!isObj(raw) || typeof raw.stickerId !== 'string' || !/^[\w.-]{1,60}$/.test(raw.stickerId) || !finiteTs(raw.ts)) return null
  return { profileId: pid, stickerId: raw.stickerId, ts: raw.ts }
}

function leafDiffs(raw: unknown, clean: unknown, path: string, out: string[]): void {
  if (isObj(clean)) {
    const r = isObj(raw) ? raw : {}
    for (const k of Object.keys(clean)) leafDiffs(r[k], clean[k], path ? `${path}.${k}` : k, out)
    return
  }
  if (JSON.stringify(raw) !== JSON.stringify(clean)) out.push(path)
}

/** Sanitises the profile object of a backup; `settings` collects the names of fields that had to be corrected. */
function sanitizeBackupProfile(raw: Record<string, unknown>, settings: string[]): Profile | null {
  if (!isSafeId(raw.id)) return null
  if (raw.kind !== 'child' && raw.kind !== 'adult') return null
  const clean = sanitizeProfile(raw)
  const name = cleanName(clean.name)
  const avatar = /^[a-z0-9_]{1,40}$/.test(clean.avatar) ? clean.avatar : 'musicha'
  const hidden = clean.aac.hiddenWordIds.filter((x) => /^[\w.-]{1,60}$/.test(x)).slice(0, LIMITS.hiddenWordIds)
  const profile: Profile = { ...clean, name, avatar, aac: { ...clean.aac, hiddenWordIds: hidden } }
  // Report only fields that were present but wrong (a missing field is just an older file).
  const diffs: string[] = []
  leafDiffs(raw, profile, '', diffs)
  for (const d of diffs) {
    const parts = d.split('.')
    let cur: unknown = raw
    let present = true
    for (const p of parts) {
      if (isObj(cur) && p in cur) cur = cur[p]
      else {
        present = false
        break
      }
    }
    if (present && d !== 'id' && d !== 'aac.hiddenWordIds') settings.push(d)
  }
  return profile
}

/** Validates a backup file's text and rebuilds it from checked fields only. */
export function parseBackup(text: string): ParseResult {
  if (text.length > LIMITS.fileChars) return { ok: false, error: 'tooBig' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid' }
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT || typeof data.version !== 'number' || !Number.isFinite(data.version)) return { ok: false, error: 'invalid' }
  if (data.version > BACKUP_VERSION) return { ok: false, error: 'newer' }
  if (data.version < 1) return { ok: false, error: 'invalid' }
  if (!isObj(data.profile)) return { ok: false, error: 'invalid' }
  for (const k of ['cards', 'recordings', 'schedules', 'stickers', 'events'] as const) {
    if (!Array.isArray(data[k])) return { ok: false, error: 'invalid' }
  }

  const ignored: IgnoredReport = { cards: 0, recordings: 0, schedules: 0, stickers: 0, events: 0, checks: 0, settings: [], device: false }
  const profile = sanitizeBackupProfile(data.profile, ignored.settings)
  if (!profile) return { ok: false, error: 'invalid' }
  const pid = profile.id

  const run = <T>(list: unknown[], cap: number, fn: (x: unknown) => T | null, key: keyof Pick<IgnoredReport, 'cards' | 'recordings' | 'schedules' | 'stickers' | 'events'>): T[] => {
    const out: T[] = []
    list.forEach((x, i) => {
      const row = i < cap ? fn(x) : null
      if (row) out.push(row)
      else ignored[key]++
    })
    return out
  }
  const cardsRaw = run(data.cards as unknown[], LIMITS.cards, (x) => sanitizeCard(x, pid), 'cards')
  const seenCards = new Set<string>()
  const cards = cardsRaw.filter((c) => (seenCards.has(c.id) ? (ignored.cards++, false) : (seenCards.add(c.id), true)))
  const recordings = run(data.recordings as unknown[], LIMITS.recordings, (x) => sanitizeRecording(x, pid), 'recordings')
  const schedulesAll = run(data.schedules as unknown[], LIMITS.schedules, (x) => sanitizeSchedule(x, pid), 'schedules')
  const byKind = new Map(schedulesAll.map((s) => [s.kind, s]))
  const schedules = [...byKind.values()]
  ignored.schedules += schedulesAll.length - schedules.length
  const stickers = run(data.stickers as unknown[], LIMITS.stickers, (x) => sanitizeSticker(x, pid), 'stickers')
  const events = run(data.events as unknown[], LIMITS.events, (x) => sanitizeEvent(x, pid), 'events')

  // Speech / communication checks: optional, rebuilt row by row (one per screening kind, the last one wins).
  let checks: CheckRow[] | undefined
  if (data.checks !== undefined) {
    if (Array.isArray(data.checks)) {
      const byKind = new Map<string, CheckRow>()
      data.checks.forEach((x, i) => {
        const row = i < LIMITS.checks ? sanitizeRow(x, pid) : null
        if (row) byKind.set(row.kind, row)
        else ignored.checks++
      })
      checks = [...byKind.values()]
    } else {
      ignored.checks++
    }
  }

  let device: DeviceBlock | undefined
  if (data.device !== undefined) {
    device = sanitizeDevice(data.device) ?? undefined
    if (!device) ignored.device = true
  }

  const exportedAt = finiteTs(data.exportedAt) ? data.exportedAt : 0
  const app = cleanText(data.app, 20) || '?'
  return {
    ok: true,
    ignored,
    backup: { format: BACKUP_FORMAT, version: data.version, app, exportedAt, profile, cards, recordings, schedules, stickers, events, ...(checks ? { checks } : {}), ...(device ? { device } : {}) },
  }
}

export interface ImportResult {
  profile: Profile
  /** True when a profile with this id was already on the device and its data was replaced. */
  replaced: boolean
  counts: { cards: number; recordings: number; events: number }
  deviceRestored: boolean
}

/**
 * Restores a backup. Rows of the same profile id already on this device are replaced; other profiles are not
 * touched. Every row is re-tagged with the backup's profile id and every key is rebuilt from it, so a
 * hand-edited file cannot overwrite another profile's rows (colliding card ids get a fresh id).
 */
export async function importBackup(b: Backup, database: GapimizDB = defaultDb, applyDeviceState = true): Promise<ImportResult> {
  const profile = sanitizeProfile(b.profile, defaultProfile())
  const pid = profile.id
  if (!isSafeId(pid)) throw new Error('bad profile id')
  const tables = [database.profiles, database.cards, database.recordings, database.events, database.schedules, database.stickers, database.checks]
  let replaced = false
  const counts = { cards: 0, recordings: 0, events: 0 }
  await database.transaction('rw', tables, async () => {
    replaced = !!(await database.profiles.get(pid))
    // Card ids are global keys: a card id owned by ANOTHER profile on this device is re-issued.
    const idMap = new Map<string, string>()
    for (const c of b.cards) {
      const existing = await database.cards.get(c.id)
      if (existing && existing.profileId !== pid) idMap.set(c.id, `${c.id}-${Math.random().toString(36).slice(2, 8)}`)
    }
    const cards: CustomCard[] = b.cards.map((c) => ({ ...c, id: idMap.get(c.id) ?? c.id, profileId: pid, image: c.image ? decodeBlob(c.image) : null }))
    const remapKey = (key: string) => (key.startsWith('c.') && idMap.has(key.slice(2)) ? `c.${idMap.get(key.slice(2))}` : key)
    const recordings: Recording[] = b.recordings.map((r) => {
      const targetKey = remapKey(r.targetKey)
      return { ...r, targetKey, id: `${pid}:${r.lang}:${targetKey}`, profileId: pid, blob: decodeBlob(r.blob) }
    })
    const schedules: ScheduleRow[] = b.schedules.map((s) => ({ ...s, id: `${pid}:${s.kind}`, profileId: pid, items: s.items.map((it) => ({ ...it, ref: remapKey(it.ref) })) }))
    const stickers = b.stickers.map((s) => ({ ...stripId(s as StickerRow), profileId: pid }))
    const events = b.events.map((e) => ({ ...stripId(e as EventRow), profileId: pid }))
    await database.cards.where('profileId').equals(pid).delete()
    await database.recordings.where('profileId').equals(pid).delete()
    await database.events.where('profileId').equals(pid).delete()
    await database.schedules.where('profileId').equals(pid).delete()
    await database.stickers.where('profileId').equals(pid).delete()
    // A file from before the checks existed has no `checks` key: the checks already on this device are left alone.
    if (b.checks) await database.checks.where('profileId').equals(pid).delete()
    await database.profiles.put(profile)
    await database.cards.bulkPut(cards)
    await database.recordings.bulkPut(recordings)
    await database.schedules.bulkPut(schedules)
    await database.stickers.bulkAdd(stickers)
    await database.events.bulkAdd(events)
    if (b.checks) await database.checks.bulkPut(b.checks.map((c) => sanitizeRow(c, pid)).filter((c): c is CheckRow => c !== null))
    counts.cards = cards.length
    counts.recordings = recordings.length
    counts.events = events.length
  })
  let deviceRestored = false
  if (applyDeviceState && b.device) {
    applyDevice(b.device, pid)
    deviceRestored = true
  }
  return { profile, replaced, counts, deviceRestored }
}

/** Removes every profile and all their data from this device (IndexedDB rows only; see wipe.ts for the rest). */
export async function wipeDatabase(database: GapimizDB = defaultDb): Promise<void> {
  const tables = [database.profiles, database.cards, database.recordings, database.events, database.schedules, database.stickers, database.checks]
  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
  })
}

/**
 * `gapimiz-aziz-2026-10-19-1432.gapimiz`: ASCII only (Cyrillic names are transliterated) and with the time, so
 * two profiles (or two copies on one day) never get the same name.
 */
export function backupFileName(profile: Pick<Profile, 'name' | 'id'>, now = Date.now()): string {
  const d = new Date(now)
  const p2 = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  return `gapimiz-${asciiSlug(profile.name)}-${date}-${p2(d.getHours())}${p2(d.getMinutes())}${BACKUP_EXT}`
}

export function backupStats(b: Backup): { cards: number; recordings: number; events: number } {
  return { cards: b.cards.length, recordings: b.recordings.length, events: b.events.length }
}
