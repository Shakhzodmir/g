import type { SpeechLang } from '../i18n/types'

export type ThemeId = 'bolajon' | 'tun' | 'tinch' | 'kattalar' | 'hc-light' | 'hc-dark'
export type Sensory = 'calm' | 'normal' | 'festive'
export type AgeGroup = '2-4' | '5-7' | '8-12' | '13+'
export type ScanMode = 'off' | 'auto1' | 'step2'

export interface AacSettings {
  /** Core vocabulary level: 1 = 9 words, 2 = 18 words, 3 = all 36. Positions never move. */
  level: 1 | 2 | 3
  showLabels: boolean
  labelPos: 'top' | 'bottom'
  colorCoding: boolean
  hiddenWordIds: string[]
}

export interface TouchSettings {
  /** Activate on pointer release inside the target (WCAG 2.5.2). */
  activateOnRelease: boolean
  /** Minimum press duration before a press counts, ms (0–1500). */
  holdMs: number
  /** Ignore repeated activations of the same target within this window, ms. */
  ignoreRepeatMs: number
  /** Hover-to-activate time for mouse/head-pointer/eye-gaze, ms (0 = off). */
  dwellMs: number
}

export interface ScanSettings {
  mode: ScanMode
  intervalMs: number
  audioCue: boolean
}

export interface VoiceSettings {
  /** Speech rate multiplier for system TTS and clip playback (0.6–1.4). */
  rate: number
  /** Prefer the device's system voice over bundled clips when one exists for the language. */
  preferSystem: boolean
  volume: number
  sfxVolume: number
  musicVolume: number
}

export interface Profile {
  id: string
  name: string
  avatar: string
  kind: 'child' | 'adult'
  ageGroup: AgeGroup
  speechLang: SpeechLang
  theme: ThemeId
  sensory: Sensory
  aac: AacSettings
  touch: TouchSettings
  scanning: ScanSettings
  voice: VoiceSettings
  /** Text size multiplier applied to the root font-size (1 | 1.25 | 1.5 | 1.75 | 2). */
  textScale: TextScale
  createdAt: number
}

export type TextScale = 1 | 1.25 | 1.5 | 1.75 | 2
export const TEXT_SCALES: readonly TextScale[] = [1, 1.25, 1.5, 1.75, 2]

export type ProfilePatch = Partial<Omit<Profile, 'aac' | 'touch' | 'scanning' | 'voice'>> & {
  aac?: Partial<AacSettings>
  touch?: Partial<TouchSettings>
  scanning?: Partial<ScanSettings>
  voice?: Partial<VoiceSettings>
}

export const DEFAULT_PROFILE_ID = 'default'

export function defaultProfile(patch: ProfilePatch = {}): Profile {
  const adult = patch.kind === 'adult'
  const base: Profile = {
    id: DEFAULT_PROFILE_ID,
    name: '',
    avatar: 'musicha',
    kind: 'child',
    ageGroup: adult ? '13+' : '5-7',
    speechLang: 'uz',
    theme: adult ? 'kattalar' : 'bolajon',
    sensory: 'normal',
    aac: { level: 2, showLabels: true, labelPos: 'bottom', colorCoding: true, hiddenWordIds: [] },
    touch: { activateOnRelease: true, holdMs: 0, ignoreRepeatMs: 300, dwellMs: 0 },
    scanning: { mode: 'off', intervalMs: 1500, audioCue: false },
    voice: { rate: 1, preferSystem: false, volume: 1, sfxVolume: 0.6, musicVolume: 0 },
    textScale: 1,
    createdAt: 0,
  }
  return mergeProfile(base, patch)
}

export function mergeProfile(p: Profile, patch: ProfilePatch): Profile {
  return {
    ...p,
    ...patch,
    aac: { ...p.aac, ...patch.aac },
    touch: { ...p.touch, ...patch.touch },
    scanning: { ...p.scanning, ...patch.scanning },
    voice: { ...p.voice, ...patch.voice },
  }
}

export const THEME_IDS: readonly ThemeId[] = ['bolajon', 'tun', 'tinch', 'kattalar', 'hc-light', 'hc-dark']
const SENSORY: readonly Sensory[] = ['calm', 'normal', 'festive']
const AGE_GROUPS: readonly AgeGroup[] = ['2-4', '5-7', '8-12', '13+']
const SCAN_MODES: readonly ScanMode[] = ['off', 'auto1', 'step2']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function str(v: unknown, fallback: string, max = 80): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback
}

/**
 * Turns anything that was stored or imported (older versions, hand-edited backups, corrupted rows) into a
 * valid Profile: unknown enum values fall back to `fallback`, numbers are clamped to the ranges the settings
 * screens allow, wrong types are ignored. Never throws.
 */
export function sanitizeProfile(raw: unknown, fallbackProfile?: Profile): Profile {
  if (!isObj(raw)) return fallbackProfile ?? defaultProfile()
  const fallback = fallbackProfile ?? defaultProfile({ kind: raw.kind === 'adult' ? 'adult' : 'child' })
  const kind = pick(raw.kind, ['child', 'adult'] as const, fallback.kind)
  const aac = isObj(raw.aac) ? raw.aac : {}
  const touch = isObj(raw.touch) ? raw.touch : {}
  const scanning = isObj(raw.scanning) ? raw.scanning : {}
  const voice = isObj(raw.voice) ? raw.voice : {}
  const level = aac.level === 1 || aac.level === 2 || aac.level === 3 ? aac.level : fallback.aac.level
  const scale = typeof raw.textScale === 'number' ? TEXT_SCALES.reduce((a, b) => (Math.abs(b - (raw.textScale as number)) < Math.abs(a - (raw.textScale as number)) ? b : a)) : fallback.textScale
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallback.id,
    name: str(raw.name, fallback.name),
    avatar: str(raw.avatar, fallback.avatar, 40) || fallback.avatar,
    kind,
    ageGroup: pick(raw.ageGroup, AGE_GROUPS, fallback.ageGroup),
    speechLang: pick(raw.speechLang, ['uz', 'ru'] as const, fallback.speechLang),
    theme: pick(raw.theme, THEME_IDS, fallback.theme),
    sensory: pick(raw.sensory, SENSORY, fallback.sensory),
    aac: {
      level,
      showLabels: bool(aac.showLabels, fallback.aac.showLabels),
      labelPos: pick(aac.labelPos, ['top', 'bottom'] as const, fallback.aac.labelPos),
      colorCoding: bool(aac.colorCoding, fallback.aac.colorCoding),
      hiddenWordIds: Array.isArray(aac.hiddenWordIds) ? aac.hiddenWordIds.filter((x): x is string => typeof x === 'string').slice(0, 500) : fallback.aac.hiddenWordIds,
    },
    touch: {
      activateOnRelease: bool(touch.activateOnRelease, fallback.touch.activateOnRelease),
      holdMs: Math.round(num(touch.holdMs, 0, 1500, fallback.touch.holdMs)),
      ignoreRepeatMs: Math.round(num(touch.ignoreRepeatMs, 0, 2000, fallback.touch.ignoreRepeatMs)),
      dwellMs: Math.round(num(touch.dwellMs, 0, 2000, fallback.touch.dwellMs)),
    },
    scanning: {
      mode: pick(scanning.mode, SCAN_MODES, fallback.scanning.mode),
      intervalMs: Math.round(num(scanning.intervalMs, 500, 5000, fallback.scanning.intervalMs)),
      audioCue: bool(scanning.audioCue, fallback.scanning.audioCue),
    },
    voice: {
      rate: num(voice.rate, 0.6, 1.4, fallback.voice.rate),
      preferSystem: bool(voice.preferSystem, fallback.voice.preferSystem),
      volume: num(voice.volume, 0, 1, fallback.voice.volume),
      sfxVolume: num(voice.sfxVolume, 0, 1, fallback.voice.sfxVolume),
      musicVolume: num(voice.musicVolume, 0, 1, fallback.voice.musicVolume),
    },
    textScale: scale,
    createdAt: num(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, fallback.createdAt),
  }
}
