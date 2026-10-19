import { db as defaultDb, type CustomCard, type EventRow, type GapimizDB, type Recording, type ScheduleRow, type StickerRow } from '../../store/db'
import { defaultProfile, mergeProfile, type Profile } from '../../store/profileTypes'

/*
 * `.gapimiz` backup: one JSON file with everything that belongs to a profile. Blobs (card photos, voice
 * recordings) are embedded as base64 so the file is self-contained and works offline.
 */

export const BACKUP_FORMAT = 'gapimiz-backup'
export const BACKUP_VERSION = 1
export const BACKUP_EXT = '.gapimiz'

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
export async function exportProfile(profile: Profile, appVersion: string, database: GapimizDB = defaultDb, now = Date.now()): Promise<Backup> {
  const pid = profile.id
  const [cards, recordings, schedules, stickers, events] = await Promise.all([
    database.cards.where('profileId').equals(pid).toArray(),
    database.recordings.where('profileId').equals(pid).toArray(),
    database.schedules.where('profileId').equals(pid).toArray(),
    database.stickers.where('profileId').equals(pid).toArray(),
    database.events.where('profileId').equals(pid).toArray(),
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
  }
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: 'invalid' | 'newer' }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Validates a backup file's text (format, version and the shape of each table). */
export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid' }
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT || typeof data.version !== 'number') return { ok: false, error: 'invalid' }
  if (data.version > BACKUP_VERSION) return { ok: false, error: 'newer' }
  if (data.version < 1) return { ok: false, error: 'invalid' }
  const p = data.profile
  if (!isObj(p) || typeof p.id !== 'string' || !p.id || (p.kind !== 'child' && p.kind !== 'adult')) return { ok: false, error: 'invalid' }
  for (const k of ['cards', 'recordings', 'schedules', 'stickers', 'events'] as const) {
    if (!Array.isArray(data[k]) || !(data[k] as unknown[]).every(isObj)) return { ok: false, error: 'invalid' }
  }
  const blobOk = (b: unknown) => isObj(b) && typeof b.data === 'string' && typeof b.mime === 'string'
  if (!(data.cards as Array<Record<string, unknown>>).every((c) => typeof c.id === 'string' && (c.image == null || blobOk(c.image)))) return { ok: false, error: 'invalid' }
  if (!(data.recordings as Array<Record<string, unknown>>).every((r) => typeof r.id === 'string' && blobOk(r.blob))) return { ok: false, error: 'invalid' }
  if (!(data.events as Array<Record<string, unknown>>).every((e) => typeof e.ts === 'number' && typeof e.type === 'string')) return { ok: false, error: 'invalid' }
  return { ok: true, backup: data as unknown as Backup }
}

/**
 * Restores a backup. Rows of the same profile id already on this device are replaced; other profiles are not
 * touched. Every row is re-tagged with the backup's profile id so a hand-edited file cannot write elsewhere.
 */
export async function importBackup(b: Backup, database: GapimizDB = defaultDb): Promise<Profile> {
  const profile = mergeProfile(defaultProfile(), b.profile)
  const pid = profile.id
  const cards: CustomCard[] = b.cards.map((c) => ({ ...c, profileId: pid, image: c.image ? decodeBlob(c.image) : null }))
  const recordings: Recording[] = b.recordings.map((r) => ({ ...r, profileId: pid, blob: decodeBlob(r.blob) }))
  const schedules = b.schedules.map((s) => ({ ...s, profileId: pid }))
  const stickers = b.stickers.map((s) => ({ ...stripId(s as StickerRow), profileId: pid }))
  const events = b.events.map((e) => ({ ...stripId(e as EventRow), profileId: pid }))
  const tables = [database.profiles, database.cards, database.recordings, database.events, database.schedules, database.stickers]
  await database.transaction('rw', tables, async () => {
    await database.cards.where('profileId').equals(pid).delete()
    await database.recordings.where('profileId').equals(pid).delete()
    await database.events.where('profileId').equals(pid).delete()
    await database.schedules.where('profileId').equals(pid).delete()
    await database.stickers.where('profileId').equals(pid).delete()
    await database.profiles.put(profile)
    await database.cards.bulkPut(cards)
    await database.recordings.bulkPut(recordings)
    await database.schedules.bulkPut(schedules)
    await database.stickers.bulkAdd(stickers)
    await database.events.bulkAdd(events)
  })
  return profile
}

/** Removes every profile and all their data from this device. */
export async function wipeDatabase(database: GapimizDB = defaultDb): Promise<void> {
  const tables = [database.profiles, database.cards, database.recordings, database.events, database.schedules, database.stickers]
  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
  })
}

/** `gapimiz-aziz-2026-10-19.gapimiz` (ASCII only, so every file system and messenger accepts it). */
export function backupFileName(profile: Pick<Profile, 'name' | 'id'>, now = Date.now()): string {
  const d = new Date(now)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const slug =
    profile.name
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'profil'
  return `gapimiz-${slug}-${date}${BACKUP_EXT}`
}

export function backupStats(b: Backup): { cards: number; recordings: number; events: number } {
  return { cards: b.cards.length, recordings: b.recordings.length, events: b.events.length }
}
