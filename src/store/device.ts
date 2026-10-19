import { useSyncExternalStore } from 'react'
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
      setBoardMode: (boardMode) =>
        set((st) => ({
          boardMode,
          // Switching on without a calibration must not run with arbitrary defaults: derive one from the viewport.
          boardCalibration: boardMode && !st.boardCalibration ? defaultCalibration(currentViewport()) : st.boardCalibration,
        })),
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

/** Lowest / highest reach fraction the layout supports. */
export const REACH_MIN = 0.15
export const REACH_MAX = 0.8

/** Unclamped reach fraction (can be < 0 or > 1 for odd inputs): what the physical geometry really says. */
export function reachRaw(c: Pick<BoardCalibration, 'diagonalIn' | 'bottomEdgeM' | 'ageGroup'>): number {
  const h = screenHeightM(c.diagonalIn)
  const reachable = REACH_TOP_M[c.ageGroup] - c.bottomEdgeM
  return reachable / h
}

/** Fraction of screen height (from bottom) a child can reach; clamped to 0.15–0.8 so the UI stays usable. */
export function reachFraction(c: Pick<BoardCalibration, 'diagonalIn' | 'bottomEdgeM' | 'ageGroup'>): number {
  return Math.min(REACH_MAX, Math.max(REACH_MIN, reachRaw(c)))
}

/** 'low': the children's real reach is below the minimum and was raised; 'high': above the maximum and was lowered. */
export function reachClamp(c: Pick<BoardCalibration, 'diagonalIn' | 'bottomEdgeM' | 'ageGroup'>): 'low' | 'high' | null {
  const r = reachRaw(c)
  return r < REACH_MIN ? 'low' : r > REACH_MAX ? 'high' : null
}

export interface Viewport {
  width: number
  height: number
}

/** Interface scale limits. */
export const SCALE_MIN = 1
export const SCALE_MAX = 2.6
/** The scaled layout must keep at least this many CSS px of height / width (below that, controls fall behind the nav). */
export const MIN_EFFECTIVE_H = 700
export const MIN_EFFECTIVE_W = 1000

const round1 = (v: number) => Math.round(v * 10) / 10

/** Largest scale at which the effective viewport (innerSize / scale) stays ≥ 700 px tall and ≥ 1000 px wide. */
export function maxScaleFor(viewport: Viewport): number {
  // ~1.5 % slack ("≈ 700 px"): keeps ×1.1 at 768 px (effective 698 px) instead of dropping to ×1.0.
  const byFit = Math.min(viewport.height / (MIN_EFFECTIVE_H * 0.985), viewport.width / (MIN_EFFECTIVE_W * 0.985))
  // Floor at 1: never shrink below normal size.
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.floor(byFit * 10 + 1e-6) / 10))
}

/** True when the chosen scale makes the effective viewport smaller than the usable minimum. */
export function scaleTooLarge(scale: number, viewport: Viewport): boolean {
  return scale > maxScaleFor(viewport) + 1e-9
}

/**
 * Suggested UI scale so that body text (≈1.125rem) has a cap height of ≈5 mm per metre of viewing distance
 * (AVIXA DISCAS basic decision making), assuming the board renders `viewport.height` CSS pixels.
 * It never exceeds what the real viewport can hold (see maxScaleFor), so a laptop never gets ×1.5.
 * A plain number is accepted as the CSS height (width unconstrained).
 */
export function suggestedScale(diagonalIn: number, distanceM: number, viewport: Viewport | number): number {
  const vp: Viewport = typeof viewport === 'number' ? { width: Infinity, height: viewport } : viewport
  const pxPerMm = vp.height / (screenHeightM(diagonalIn) * 1000)
  const capMm = 5 * distanceM
  const fontPx = (capMm * pxPerMm) / 0.7
  const scale = fontPx / 18
  const wanted = Math.min(SCALE_MAX, Math.max(1.2, scale))
  return round1(Math.min(wanted, maxScaleFor(vp)))
}

/** Scale actually applied: the saved/default scale, clamped so the viewport stays usable. */
export function effectiveScale(calib: Pick<BoardCalibration, 'scale'> | null, viewport: Viewport): number {
  const wanted = calib?.scale ?? round1(Math.min(SCALE_MAX, Math.max(SCALE_MIN, viewport.height / 720)))
  return round1(Math.min(maxScaleFor(viewport), Math.max(SCALE_MIN, wanted)))
}

/** Calibration used when board mode is switched on without one: a typical 75″ classroom board, sized from the viewport. */
export function defaultCalibration(viewport: Viewport): BoardCalibration {
  const base = { diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8' as ReachAge, distanceM: 4 }
  return { ...base, scale: suggestedScale(base.diagonalIn, base.distanceM, viewport), reach: reachFraction(base) }
}

/** Height of the bottom bar in board mode, rem (AppShell.module.css → --board-nav-h). */
export const BOARD_NAV_REM = 7
/** The reach zone is never smaller than this, rem (one row of big tiles must fit). */
export const REACH_ZONE_MIN_REM = 10

/**
 * Height in px of the reach zone: the bottom `reach` share of the screen above the bottom bar, at least 10 rem.
 * Mirrors the CSS `--reach-h: max(10rem, (100dvh - 7rem) * var(--reach))`.
 */
export function reachZoneHeight(viewportHeight: number, reach: number, remPx: number): number {
  return Math.max(REACH_ZONE_MIN_REM * remPx, (viewportHeight - BOARD_NAV_REM * remPx) * reach)
}

export function currentViewport(): Viewport {
  return typeof window === 'undefined' ? { width: 1920, height: 1080 } : { width: window.innerWidth, height: window.innerHeight }
}

let cachedViewport: Viewport = currentViewport()
function readViewport(): Viewport {
  const now = currentViewport()
  if (now.width !== cachedViewport.width || now.height !== cachedViewport.height) cachedViewport = now
  return cachedViewport
}

/** Live viewport size (CSS px, before the board scale); re-renders on resize / rotation / fullscreen. */
export function useViewport(): Viewport {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb)
      return () => window.removeEventListener('resize', cb)
    },
    readViewport,
    () => ({ width: 1920, height: 1080 }),
  )
}
