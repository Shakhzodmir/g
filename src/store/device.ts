import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UiLang, UzScript } from '../i18n/types'
import { safeLocalStorage } from './safeStorage'

export type ReachAge = '3-4' | '5-8' | '9-12' | 'adult'

export interface BoardCalibration {
  /** Screen diagonal in inches (65, 75, 86 …). */
  diagonalIn: number
  /** Height of the bottom edge of the screen above the floor, metres. */
  bottomEdgeM: number
  ageGroup: ReachAge
  /** Distance to the farthest viewer, metres. */
  distanceM: number
  /** UI scale factor applied to the root font-size in board mode. */
  scale: number
  /** Fraction of the screen height (from the bottom) children can reach, 0.15–0.8. */
  reach: number
}

export interface DeviceState {
  uiLang: UiLang
  uzScript: UzScript
  onboarded: boolean
  activeProfileId: string | null
  boardMode: boolean
  boardHintDismissed: boolean
  boardCalibration: BoardCalibration | null
  /** SHA-256 hex of the optional adult PIN; null = hold-to-unlock only. */
  parentPinHash: string | null
  setUiLang: (lang: UiLang) => void
  setUzScript: (script: UzScript) => void
  setOnboarded: (v: boolean) => void
  setActiveProfileId: (id: string | null) => void
  setBoardMode: (v: boolean) => void
  dismissBoardHint: () => void
  setBoardCalibration: (c: BoardCalibration | null) => void
  setParentPinHash: (hash: string | null) => void
}

export const useDevice = create<DeviceState>()(
  persist(
    (set) => ({
      uiLang: 'uz',
      uzScript: 'latn',
      onboarded: false,
      activeProfileId: null,
      boardMode: false,
      boardHintDismissed: false,
      boardCalibration: null,
      parentPinHash: null,
      setUiLang: (uiLang) => set({ uiLang, uzScript: uiLang === 'uzc' ? 'cyrl' : 'latn' }),
      setUzScript: (uzScript) => set({ uzScript }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
      setBoardMode: (boardMode) => set({ boardMode }),
      dismissBoardHint: () => set({ boardHintDismissed: true }),
      setBoardCalibration: (boardCalibration) => set({ boardCalibration }),
      setParentPinHash: (parentPinHash) => set({ parentPinHash }),
    }),
    { name: 'gapimiz.device', version: 1, storage: createJSONStorage(safeLocalStorage) },
  ),
)

/** Physical reach (metres above floor) per age group, from ADA recommended ranges for children. */
const REACH_TOP_M: Record<ReachAge, number> = { '3-4': 0.91, '5-8': 1.02, '9-12': 1.12, adult: 1.22 }

/** Screen height in metres for a 16:9 display of the given diagonal. */
export function screenHeightM(diagonalIn: number): number {
  return (diagonalIn * 0.0254 * 9) / Math.sqrt(16 * 16 + 9 * 9)
}

/** Fraction of screen height (from bottom) a child can reach; clamped to 0.15–0.8 so the UI stays usable. */
export function reachFraction(c: Pick<BoardCalibration, 'diagonalIn' | 'bottomEdgeM' | 'ageGroup'>): number {
  const h = screenHeightM(c.diagonalIn)
  const reachable = REACH_TOP_M[c.ageGroup] - c.bottomEdgeM
  return Math.min(0.8, Math.max(0.15, reachable / h))
}

/**
 * Suggested UI scale so that body text (≈1.125rem) has a cap height of ≈5 mm per metre of viewing distance
 * (AVIXA DISCAS basic decision making), assuming the board renders `cssHeight` CSS pixels.
 */
export function suggestedScale(diagonalIn: number, distanceM: number, cssHeight: number): number {
  const pxPerMm = cssHeight / (screenHeightM(diagonalIn) * 1000)
  const capMm = 5 * distanceM
  const fontPx = (capMm * pxPerMm) / 0.7
  const scale = fontPx / 18
  return Math.round(Math.min(2.6, Math.max(1.2, scale)) * 10) / 10
}
