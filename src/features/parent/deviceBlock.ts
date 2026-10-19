import type { UiLang, UzScript } from '../../i18n/types'
import { useDevice, type BoardCalibration, type ReachAge } from '../../store/device'
import { useExerciseSettings, type BlowScene } from '../exercises/settings'
import { applyTimerPrefs, getTimerPrefs } from '../timer/store'
import { loadLevel, saveLevel } from '../games/logic/levelKey'
import { clampGoal, type TokenBoard } from '../tokens/tokenLogic'
import { useTokenStore } from '../tokens/store'

/*
 * Device-side state that is not in IndexedDB but belongs to a person's setup: the token board, the visual
 * timer settings, game levels, exercise sensitivity, UI language/script and board mode/calibration.
 * The adult PIN is excluded on purpose (a backup file must never carry the key to the adult area).
 */

export const DEVICE_BLOCK_VERSION = 1
export const GAME_IDS = ['animals', 'find', 'memory', 'syllables'] as const

export interface DeviceBlock {
  version: number
  ui: { uiLang: UiLang; uzScript: UzScript; boardMode: boolean; boardCalibration: BoardCalibration | null }
  tokens: { board: TokenBoard | null }
  timer: { minutes: number; showDigits: boolean | null; nextRef: string | null }
  exercises: { blowSensitivity: number; voiceSensitivity: number; mirrorThreshold: number; blowScene: BlowScene }
  gameLevels: Record<string, 1 | 2 | 3>
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const clamp = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback)
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback)
const REACH_AGES: readonly ReachAge[] = ['3-4', '5-8', '9-12', 'adult']
const REF = /^[A-Za-z0-9][\w.:-]{0,79}$/

function sanitizeCalibration(v: unknown): BoardCalibration | null {
  if (!isObj(v)) return null
  return {
    diagonalIn: clamp(v.diagonalIn, 20, 120, 75),
    bottomEdgeM: clamp(v.bottomEdgeM, 0, 2, 0.8),
    ageGroup: pick(v.ageGroup, REACH_AGES, '5-8'),
    distanceM: clamp(v.distanceM, 0.5, 15, 4),
    scale: clamp(v.scale, 1, 3, 1.5),
    reach: clamp(v.reach, 0.15, 0.8, 0.45),
  }
}

function sanitizeBoard(v: unknown): TokenBoard | null {
  if (!isObj(v)) return null
  const goal = clampGoal(typeof v.goal === 'number' ? v.goal : 5)
  const count = Math.round(clamp(v.count, 0, goal, 0))
  const rewardRef = typeof v.rewardRef === 'string' && REF.test(v.rewardRef) ? v.rewardRef : null
  return { goal, count, rewardRef }
}

/** Anything → a valid block (never throws, unknown parts fall back to defaults). `null` when there is nothing usable. */
export function sanitizeDevice(raw: unknown): DeviceBlock | null {
  if (!isObj(raw)) return null
  const ui = isObj(raw.ui) ? raw.ui : {}
  const timer = isObj(raw.timer) ? raw.timer : {}
  const ex = isObj(raw.exercises) ? raw.exercises : {}
  const tokens = isObj(raw.tokens) ? raw.tokens : {}
  const levels = isObj(raw.gameLevels) ? raw.gameLevels : {}
  const uiLang = pick(ui.uiLang, ['uz', 'uzc', 'ru'] as const, 'uz')
  // The script follows the language; only the experimental 2026 Latin is an extra choice for `uz`.
  const uzScript: UzScript = uiLang === 'uzc' ? 'cyrl' : uiLang === 'uz' && ui.uzScript === 'latn2026' ? 'latn2026' : 'latn'
  const gameLevels: Record<string, 1 | 2 | 3> = {}
  for (const id of GAME_IDS) {
    const n = Number(levels[id])
    if (n === 1 || n === 2 || n === 3) gameLevels[id] = n
  }
  return {
    version: DEVICE_BLOCK_VERSION,
    ui: { uiLang, uzScript, boardMode: ui.boardMode === true, boardCalibration: sanitizeCalibration(ui.boardCalibration) },
    tokens: { board: sanitizeBoard(tokens.board) },
    timer: {
      minutes: Math.round(clamp(timer.minutes, 1, 60, 3)),
      showDigits: typeof timer.showDigits === 'boolean' ? timer.showDigits : null,
      nextRef: typeof timer.nextRef === 'string' && REF.test(timer.nextRef) ? timer.nextRef : null,
    },
    exercises: {
      blowSensitivity: Math.round(clamp(ex.blowSensitivity, 1, 10, 5)),
      voiceSensitivity: Math.round(clamp(ex.voiceSensitivity, 1, 10, 5)),
      mirrorThreshold: clamp(ex.mirrorThreshold, 0.1, 0.6, 0.25),
      blowScene: pick(ex.blowScene, ['candles', 'dandelion', 'boat'] as const, 'candles'),
    },
    gameLevels,
  }
}

/** Reads the current device-side state for one profile. */
export function collectDevice(profileId: string): DeviceBlock {
  const dev = useDevice.getState()
  const timer = getTimerPrefs(profileId)
  const ex = useExerciseSettings.getState()
  const gameLevels: Record<string, 1 | 2 | 3> = {}
  for (const id of GAME_IDS) gameLevels[id] = loadLevel(profileId, id)
  return {
    version: DEVICE_BLOCK_VERSION,
    ui: { uiLang: dev.uiLang, uzScript: dev.uzScript, boardMode: dev.boardMode, boardCalibration: dev.boardCalibration },
    tokens: { board: useTokenStore.getState().boards[profileId] ?? null },
    timer: { minutes: timer.minutes, showDigits: timer.showDigits, nextRef: timer.nextRef },
    exercises: { blowSensitivity: ex.blowSensitivity, voiceSensitivity: ex.voiceSensitivity, mirrorThreshold: ex.mirrorThreshold, blowScene: ex.blowScene },
    gameLevels,
  }
}

/** Writes a (sanitized) block back into the stores. The PIN, onboarding and active profile are never touched. */
export function applyDevice(block: DeviceBlock, profileId: string): void {
  const b = sanitizeDevice(block)
  if (!b) return
  const dev = useDevice.getState()
  dev.setUiLang(b.ui.uiLang)
  if (b.ui.uzScript === 'latn2026') dev.setUzScript('latn2026')
  dev.setBoardCalibration(b.ui.boardCalibration)
  dev.setBoardMode(b.ui.boardMode)
  if (b.tokens.board) useTokenStore.getState().setBoard(profileId, b.tokens.board)
  applyTimerPrefs(profileId, b.timer) // also resets the timer: a restored timer never starts by itself
  useExerciseSettings.getState().set(b.exercises)
  for (const id of GAME_IDS) {
    const level = b.gameLevels[id]
    if (level) saveLevel(profileId, id, level)
  }
}

/** Count of non-empty parts, for the "what is in the file" summary. */
export function deviceSummary(b: DeviceBlock | undefined): number {
  if (!b) return 0
  return (b.tokens.board ? 1 : 0) + 1 + 1 + Object.keys(b.gameLevels).length
}

