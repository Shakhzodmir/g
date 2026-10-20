import Dexie, { type Table } from 'dexie'
import type { Fitz, TopicId } from '../content/types'
import type { CheckRow } from '../features/check/types'
import type { Profile } from './profileTypes'

export type EventType =
  | 'aac_word'
  | 'aac_phrase'
  | 'aac_speak'
  | 'aac_model'
  | 'game_round'
  | 'exercise'
  | 'session_start'
  | 'schedule_done'

export interface CustomCard {
  id: string
  profileId: string
  topic: TopicId
  fitz: Fitz
  /** Canonical Uzbek Latin label (normalized). */
  uz: string
  ru: string
  /** Photo (JPEG/WebP, ≤512 px) or null when a built-in symbol is used. */
  image?: Blob | null
  symbol?: string
  hidden?: boolean
  createdAt: number
}

export interface Recording {
  /** `${profileId}:${targetKey}`, target = audio key (w.water) or custom card key (c.<id>). */
  id: string
  profileId: string
  targetKey: string
  lang: 'uz' | 'ru'
  blob: Blob
  mime: string
  createdAt: number
}

export interface EventRow {
  id?: number
  profileId: string
  type: EventType
  ref: string
  ts: number
  meta?: Record<string, unknown>
}

export interface ScheduleItem {
  /** Word id, phrase id or custom card id (prefixed `c.`). */
  ref: string
  done: boolean
}

export interface ScheduleRow {
  id: string
  profileId: string
  name: string
  kind: 'first-then' | 'day'
  items: ScheduleItem[]
  updatedAt: number
}

export interface StickerRow {
  id?: number
  profileId: string
  stickerId: string
  ts: number
}

export class GapimizDB extends Dexie {
  profiles!: Table<Profile, string>
  cards!: Table<CustomCard, string>
  recordings!: Table<Recording, string>
  events!: Table<EventRow, number>
  schedules!: Table<ScheduleRow, string>
  stickers!: Table<StickerRow, number>
  /** Nutq tekshiruvi: one row per profile and screening (results, plan, ticks). Added in schema version 2. */
  checks!: Table<CheckRow, string>

  constructor(name = 'gapimiz') {
    super(name)
    this.version(1).stores({
      profiles: 'id',
      cards: 'id, profileId',
      recordings: 'id, profileId',
      events: '++id, profileId, type, ts, [profileId+ts]',
      schedules: 'id, profileId',
      stickers: '++id, profileId, ts',
    })
    // v2: speech / communication checks. Only the new table is declared; the others carry over unchanged.
    this.version(2).stores({
      checks: 'id, profileId',
    })
  }
}

export const db = new GapimizDB()

let available: Promise<boolean> | null = null

/** How long to wait for IndexedDB.open() before giving up: some broken profiles never answer (no error, no success). */
export const DB_OPEN_TIMEOUT_MS = 2500

/**
 * Resolves false when IndexedDB is unavailable (private mode, quota, blocked, or simply never answers within
 * ~2.5 s); the app then runs in memory instead of showing a blank page forever.
 */
export function dbAvailable(): Promise<boolean> {
  available ??= new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), DB_OPEN_TIMEOUT_MS)
    let opened: Promise<unknown>
    try {
      opened = db.open()
    } catch {
      clearTimeout(timer)
      resolve(false)
      return
    }
    opened.then(
      () => {
        clearTimeout(timer)
        resolve(true)
      },
      () => {
        clearTimeout(timer)
        resolve(false)
      },
    )
  })
  return available
}

/** For tests only. */
export function resetDbAvailability(): void {
  available = null
}

export function newId(prefix = ''): string {
  const rnd = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix + rnd
}
