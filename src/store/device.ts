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
  /**
   * Board-mode preview (never persisted): the teacher sees the layout with the draft values before saving.
   * `boardPreviewBase` holds the real settings to come back to; null = no preview running.
   */
  boardPreviewBase: { boardMode: boolean; boardCalibration: BoardCalibration | null } | null
  startBoardPreview: (c: BoardCalibration) => void
  commitBoardPreview: () => void
  cancelBoardPreview: () => void
}

/** Lowest / highest reach fraction the layout supports. */
export const REACH_MIN = 0.15
export const REACH_MAX = 0.8
/** Interface scale limits. */
export const SCALE_MIN = 1
export const SCALE_MAX = 2.6

/** The persisted (data) part of the device state. */
type PersistedDevice = Pick<
  DeviceState,
  'uiLang' | 'uzScript' | 'onboarded' | 'activeProfileId' | 'boardMode' | 'boardHintDismissed' | 'boardCalibration' | 'parentPinHash'
>

const UI_LANGS: readonly UiLang[] = ['uz', 'uzc', 'ru']
const UZ_SCRIPTS: readonly UzScript[] = ['latn', 'cyrl', 'latn2026']
const REACH_AGES: readonly ReachAge[] = ['3-4', '5-8', '9-12', 'adult']
const num = (v: unknown, def: number, lo = -Infinity, hi = Infinity): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def)

function sanitizeCalibration(v: unknown): BoardCalibration | null {
  if (!v || typeof v !== 'object') return null
  const c = v as Record<string, unknown>
  return {
    diagonalIn: num(c.diagonalIn, 75, 10, 200),
    bottomEdgeM: num(c.bottomEdgeM, 0.8, 0, 3),
    ageGroup: REACH_AGES.includes(c.ageGroup as ReachAge) ? (c.ageGroup as ReachAge) : '5-8',
    distanceM: num(c.distanceM, 4, 0.3, 30),
    scale: num(c.scale, 1, SCALE_MIN, SCALE_MAX),
    reach: num(c.reach, 0.45, REACH_MIN, REACH_MAX),
  }
}

/**
 * Upgrades saved device state from ANY version (older or newer than this build) without losing it: known fields are
 * kept (type-checked), missing or malformed ones fall back to defaults. Without a `migrate`, zustand throws away the
 * whole saved object on a version mismatch, which would silently erase the adult PIN, the board calibration and the
 * "onboarded" flag and send the family back to onboarding. Never bump `version` without extending this function.
 */
export function migrateDevice(persisted: unknown, _version?: number): PersistedDevice {
  const p = persisted && typeof persisted === 'object' ? (persisted as Record<string, unknown>) : {}
  const uiLang = UI_LANGS.includes(p.uiLang as UiLang) ? (p.uiLang as UiLang) : 'uz'
  return {
    uiLang,
    uzScript: UZ_SCRIPTS.includes(p.uzScript as UzScript) ? (p.uzScript as UzScript) : uiLang === 'uzc' ? 'cyrl' : 'latn',
    onboarded: p.onboarded === true,
    activeProfileId: typeof p.activeProfileId === 'string' ? p.activeProfileId : null,
    boardMode: p.boardMode === true,
    boardHintDismissed: p.boardHintDismissed === true,
    boardCalibration: sanitizeCalibration(p.boardCalibration),
    parentPinHash: typeof p.parentPinHash === 'string' && p.parentPinHash ? p.parentPinHash : null,
  }
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
      boardPreviewBase: null,
      startBoardPreview: (c) =>
        set((st) => ({
          boardPreviewBase: st.boardPreviewBase ?? { boardMode: st.boardMode, boardCalibration: st.boardCalibration },
          boardMode: true,
          boardCalibration: c,
        })),
      commitBoardPreview: () => set({ boardPreviewBase: null }),
      cancelBoardPreview: () =>
        set((st) => (st.boardPreviewBase ? { boardMode: st.boardPreviewBase.boardMode, boardCalibration: st.boardPreviewBase.boardCalibration, boardPreviewBase: null } : {})),
      setUiLang: (uiLang) => set({ uiLang, uzScript: uiLang === 'uzc' ? 'cyrl' : 'latn' }),
      setUzScript: (uzScript) => set({ uzScript }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
      setBoardMode: (boardMode) =>
        set((st) => ({
          boardMode,
          // An explicit choice ends any preview.
          boardPreviewBase: null,
          // Switching on without a calibration must not run with arbitrary defaults: derive one from the viewport.
          boardCalibration: boardMode && !st.boardCalibration ? defaultCalibration(currentViewport()) : st.boardCalibration,
        })),
      dismissBoardHint: () => set({ boardHintDismissed: true }),
      setBoardCalibration: (boardCalibration) => set({ boardCalibration }),
      setParentPinHash: (parentPinHash) => set({ parentPinHash }),
    }),
    {
      name: 'gapimiz.device',
      version: 1,
      storage: createJSONStorage(safeLocalStorage),
      // Only data is stored; a running board preview stores the settings it will return to, never the draft.
      partialize: (st): PersistedDevice => {
        const base = st.boardPreviewBase
        return {
          uiLang: st.uiLang,
          uzScript: st.uzScript,
          onboarded: st.onboarded,
          activeProfileId: st.activeProfileId,
          boardMode: base ? base.boardMode : st.boardMode,
          boardHintDismissed: st.boardHintDismissed,
          boardCalibration: base ? base.boardCalibration : st.boardCalibration,
          parentPinHash: st.parentPinHash,
        }
      },
      migrate: (persisted, version) => migrateDevice(persisted, version) as DeviceState,
    },
  ),
)

/** Physical reach (metres above floor) per age group, from ADA recommended ranges for children. */
const REACH_TOP_M: Record<ReachAge, number> = { '3-4': 0.91, '5-8': 1.02, '9-12': 1.12, adult: 1.22 }

/** Screen height in metres for a 16:9 display of the given diagonal. */
export function screenHeightM(diagonalIn: number): number {
  return (diagonalIn * 0.0254 * 9) / Math.sqrt(16 * 16 + 9 * 9)
}


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
