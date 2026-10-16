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
  createdAt: number
}

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
