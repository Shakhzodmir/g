import Dexie, { type Table } from 'dexie'
import type { Fitz, TopicId } from '../content/types'
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
  }
}

export const db = new GapimizDB()

let available: Promise<boolean> | null = null

/** Resolves false when IndexedDB is unavailable (private mode, quota, blocked); the app then runs in memory. */
export function dbAvailable(): Promise<boolean> {
  available ??= db
    .open()
    .then(() => true)
    .catch(() => false)
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
