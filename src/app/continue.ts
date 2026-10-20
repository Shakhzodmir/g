import { PHRASES } from '../content/phrases'
import { topicsForKind } from '../content/topics'
import type { TopicId } from '../content/types'
import { wordsForKind } from '../content/vocab'
import { bi as exerciseText } from '../features/exercises/strings'
import { S as AAC } from '../features/aac/strings'
import { gameMeta, gamesFor } from '../features/games/registry'
import type { Bi } from '../i18n/types'
import type { EventRow } from '../store/db'
import { FEATURES, featureAllowed, type FeatureId } from './features'

/*
 * "Davom etamiz": what the active profile did last, as one thing it can go back to. It is read from the usage log
 * (the `events` table), so it needs no storage of its own: it is exported, restored and wiped with the events, and a
 * profile that never did anything simply has nothing to continue.
 *
 * The newest event that still points at something real wins. An event is skipped, and the next older one tried, when
 *  - it is not something one can go back to (a typed sentence, a feeling, the session start),
 *  - it points at a game, exercise or topic that no longer exists,
 *  - or it belongs to the other kind of profile (an adult never resumes a child-only game or topic, and the reverse).
 */

export type ResumeKind = 'game' | 'exercise' | 'talk' | 'day'

export interface Resume {
  kind: ResumeKind
  /** Game id, exercise id, topic id / talk mode, or 'day'. */
  ref: string
  /** Where the button goes (a route inside the app, query included). */
  to: string
  symbol: string
  /** The thing's own name; the card adds the "game / exercise" word around it. */
  title: Bi
  /** Games only: the level the game opens on. */
  level?: 1 | 2 | 3
  /** When it happened. */
  ts: number
}

type Kind = 'child' | 'adult'

/**
 * A mirror (articulation) pose: only what the card needs. The pose data (content/exercises) is a lazy-only chunk, so it
 * is handed in by the caller when an event needs it (`needsPoses`) instead of being imported into the Home screen.
 */
export interface PoseInfo {
  id: string
  title: Bi
}

const isLevel = (v: unknown): v is 1 | 2 | 3 => v === 1 || v === 2 || v === 3

/** Speech exercises of the hub that are not articulation poses. */
const SPEECH_EXERCISES: Record<string, { to: string; symbol: string; symbolAdult: string; title: Bi; titleAdult?: Bi }> = {
  blow: { to: '/exercises/blow', symbol: 'wind_face', symbolAdult: 'wind_face', title: exerciseText('blowTitle') },
  voice: { to: '/exercises/voice', symbol: 'speaking_head', symbolAdult: 'microphone', title: exerciseText('voiceTitle'), titleAdult: exerciseText('voiceTitleAdult') },
}

const allowed = (feature: FeatureId, kind: Kind) => featureAllowed(FEATURES[feature], kind)

function game(ref: string, kind: Kind, level: unknown, ts: number): Resume | null {
  if (!allowed('games', kind)) return null
  const def = gamesFor(kind).find((g) => g.id === ref)
  const meta = gameMeta(ref)
  if (!def || !meta) return null
  return {
    kind: 'game',
    ref,
    to: `${FEATURES.games.path}/${ref}`,
    symbol: meta.symbol,
    title: kind === 'adult' && meta.titleAdult ? meta.titleAdult : meta.title,
    level: isLevel(level) ? level : undefined,
    ts,
  }
}

function exercise(ref: string, kind: Kind, ts: number, poses: readonly PoseInfo[]): Resume | null {
  if (!allowed('exercises', kind)) return null
  const speech = SPEECH_EXERCISES[ref]
  if (speech) {
    return { kind: 'exercise', ref, to: speech.to, symbol: kind === 'adult' ? speech.symbolAdult : speech.symbol, title: kind === 'adult' && speech.titleAdult ? speech.titleAdult : speech.title, ts }
  }
  const pose = poses.find((a) => a.id === ref)
  if (!pose) return null
  return { kind: 'exercise', ref, to: `${FEATURES.exercises.path}/mirror/${pose.id}`, symbol: 'lips', title: pose.title, ts }
}

/** The topic board of a word the person tapped (null when the word or its topic is not for this kind of profile). */
function topicOf(wordId: string, kind: Kind): TopicId | null {
  const w = wordsForKind(kind).find((x) => x.id === wordId)
  if (!w) return null
  return topicsForKind(kind).some((t) => t.id === w.topic) ? w.topic : null
}

function talk(row: EventRow, kind: Kind): Resume | null {
  if (!allowed('aac', kind)) return null
  const base = FEATURES.aac.path
  const { ref, ts } = row
  if (row.type === 'aac_speak') {
    // Only the typed-sentence keyboard leaves a trace worth returning to; the message bar's own sentences do not.
    return ref === 'kb' ? { kind: 'talk', ref: 'keyboard', to: `${base}?mode=keyboard`, symbol: 'keyboard', title: { uz: AAC.uz.keyboard, ru: AAC.ru.keyboard }, ts } : null
  }
  if (/^(helper|feeling):/.test(ref) || ref.startsWith('c.')) return null
  if (row.type === 'aac_phrase') {
    return PHRASES.some((p) => p.id === ref) ? { kind: 'talk', ref: 'phrases', to: `${base}?mode=phrases`, symbol: 'speech_balloon', title: { uz: AAC.uz.phrases, ru: AAC.ru.phrases }, ts } : null
  }
  const topic = topicOf(ref, kind)
  if (!topic) return null
  const def = topicsForKind(kind).find((t) => t.id === topic)
  if (!def) return null
  return { kind: 'talk', ref: topic, to: topic === 'core' ? base : `${base}?topic=${topic}`, symbol: def.symbol, title: { uz: def.uz, ru: def.ru }, ts }
}

function day(ts: number, kind: Kind): Resume | null {
  if (!allowed('schedule', kind)) return null
  return { kind: 'day', ref: 'day', to: FEATURES.schedule.path, symbol: FEATURES.schedule.symbol, title: kind === 'adult' && FEATURES.schedule.adultTitle ? FEATURES.schedule.adultTitle : FEATURES.schedule.title, ts }
}

/** What a single event points at, or null. */
export function resumeOf(row: EventRow, kind: Kind, poses: readonly PoseInfo[] = []): Resume | null {
  switch (row.type) {
    case 'game_round':
      return game(row.ref, kind, row.meta?.level, row.ts)
    case 'exercise':
      return exercise(row.ref, kind, row.ts, poses)
    case 'aac_word':
    case 'aac_model':
    case 'aac_phrase':
    case 'aac_speak':
      return talk(row, kind)
    case 'schedule_done':
      return day(row.ts, kind)
    default:
      return null
  }
}

/** The newest thing of the events (any order) that this kind of profile can really go back to; null = nothing yet. */
export function resolveResume(events: readonly EventRow[], kind: Kind, poses: readonly PoseInfo[] = []): Resume | null {
  const newestFirst = [...events].sort((a, b) => b.ts - a.ts)
  for (const row of newestFirst) {
    const r = resumeOf(row, kind, poses)
    if (r) return r
  }
  return null
}

/** True when some event is a mirror pose, so the pose data has to be loaded before `resolveResume` can name it. */
export function needsPoses(events: readonly EventRow[]): boolean {
  return events.some((e) => e.type === 'exercise' && !(e.ref in SPEECH_EXERCISES))
}
