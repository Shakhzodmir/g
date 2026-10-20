import type { Bi } from '../i18n/types'

/** Part-of-speech colour class (modified Fitzgerald key). Colour is never the only carrier of meaning. */
export type Fitz = 'people' | 'action' | 'describe' | 'thing' | 'social' | 'question' | 'negation' | 'misc'

export type Audience = 'child' | 'adult' | 'both'

/** Known topic ids; any other lowercase ascii id is also allowed so new topics don't need a union edit. */
export type KnownTopicId =
  | 'core'
  | 'food'
  | 'drinks'
  | 'people'
  | 'feelings'
  | 'body'
  | 'toys'
  | 'places'
  | 'clothes'
  | 'actions'
  | 'animals'
  | 'school'
  | 'time'

export type TopicId = KnownTopicId | (string & {})

export interface Word extends Bi {
  /** Who should meet this word: kids' games/boards, adult boards, or both (default 'both'). */
  audience?: Audience
  /** Stable ascii id, unique across all words, e.g. `water`. Used in audio keys `w.<id>`. */
  id: string
  fitz: Fitz
  /** Symbol id; the image lives at `public/symbols/<symbol>.webp` (or `.svg` for custom art). */
  symbol: string
  topic: TopicId
  /** Russian text with `+` before the stressed vowel, used only for build-time speech synthesis. */
  ruTts?: string
  /** Optional Uzbek override for speech synthesis (e.g. phonetic spelling). */
  uzTts?: string
  /** Position in the fixed 6×6 core grid (0-based). Only for topic `core`. */
  core?: { row: number; col: number; level: 1 | 2 | 3 }
  /** Syllable split with `-`, e.g. `{ uz: 'ol-ma', ru: 'яб-ло-ко' }`. */
  syllables?: Bi
}

export interface Topic extends Bi {
  id: TopicId
  symbol: string
  fitz: Fitz
  /** Who sees this topic on the communicator tabs and in games (default 'both'). */
  audience?: Audience
}

export interface Phrase extends Bi {
  id: string
  symbol: string
  ruTts?: string
  uzTts?: string
  audience: 'kid' | 'adult' | 'both'
  /** Optional category id (adult phrases: need, pain, med, talk, emergency, social, shop, work, phone, family, feel, polite, frame). */
  group?: string
}

/** Animal / vehicle for the "Who says what?" game. */
export interface SoundMaker extends Bi {
  id: string
  symbol: string
  /** Onomatopoeia, e.g. `{ uz: 'miyov-miyov', ru: 'мяу-мяу' }`. */
  sound: Bi
  ruSoundTts?: string
  kind: 'animal' | 'vehicle'
}

/** Face pose names understood by the Ogizcha articulation model. */
export type OgizchaPose =
  | 'neutral'
  | 'smile'
  | 'tube'
  | 'open'
  | 'cheeks'
  | 'fence'
  | 'clock-left'
  | 'clock-right'
  | 'spatula'
  | 'needle'
  | 'horse'
  | 'jam'

/** MediaPipe blendshape names used to measure an exercise (null = mirror-only, adult confirms). */
export type BlendMetric =
  | { kind: 'single'; name: string }
  | { kind: 'avg'; names: string[] }
  | null

export interface ArticulationExercise {
  id: string
  title: Bi
  /** Short child-friendly instruction, spoken aloud. */
  instruction: Bi
  ruInstructionTts?: string
  pose: OgizchaPose
  metric: BlendMetric
  /** Seconds to hold the pose for one repetition. */
  holdSec: number
  reps: number
}

export interface ParentTip {
  id: string
  title: Bi
  body: Bi
  symbol: string
}

export interface Sticker extends Bi {
  id: string
  symbol: string
}

/** Audio key: 'w.<wordId>' | 'p.<phraseId>' | 's.<soundMakerId>' (name) | 'o.<soundMakerId>' (onomatopoeia) | 'g.<game>.<id>' | 'ui.<id>' | 'x.<exerciseId>' */
export type AudioKey = string
