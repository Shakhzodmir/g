import { describe, expect, it } from 'vitest'
import {
  defaultCalibration,
  migrateDevice,
  effectiveScale,
  maxScaleFor,
  reachClamp,
  reachFraction,
  reachZoneHeight,
  reachRaw,
  scaleTooLarge,
  suggestedScale,
  useDevice,
} from './device'

const LAPTOP = { width: 1366, height: 768 }
const FHD = { width: 1920, height: 1080 }
const UHD = { width: 3840, height: 2160 }

describe('maxScaleFor / effectiveScale', () => {
  it('keeps the effective viewport ≥ ~700 px tall and ≥ 1000 px wide', () => {
    for (const vp of [LAPTOP, FHD, UHD, { width: 1280, height: 720 }, { width: 2560, height: 1440 }]) {
      const s = maxScaleFor(vp)
      expect(vp.height / s).toBeGreaterThanOrEqual(690)
      expect(vp.width / s).toBeGreaterThanOrEqual(985)
    }
  })

  it('caps ×1.5 at 1366×768 (the QA defect) and allows it at 1920×1080', () => {
    expect(effectiveScale({ scale: 1.5 }, LAPTOP)).toBeLessThanOrEqual(1.1)
    expect(effectiveScale({ scale: 1.5 }, FHD)).toBe(1.5)
    expect(effectiveScale({ scale: 2.6 }, UHD)).toBe(2.6)
  })

  it('never goes below 1 and never above 2.6', () => {
    expect(effectiveScale({ scale: 0.4 }, FHD)).toBe(1)
    expect(effectiveScale({ scale: 9 }, UHD)).toBe(2.6)
    expect(effectiveScale({ scale: 3 }, { width: 600, height: 400 })).toBe(1)
  })

  it('derives a default from the viewport when there is no calibration', () => {
    expect(effectiveScale(null, FHD)).toBe(1.5)
    expect(effectiveScale(null, LAPTOP)).toBeLessThanOrEqual(1.1)
    expect(effectiveScale(null, UHD)).toBe(2.6)
  })

  it('scaleTooLarge flags a scale that does not fit', () => {
    expect(scaleTooLarge(1.5, LAPTOP)).toBe(true)
    expect(scaleTooLarge(1.1, LAPTOP)).toBe(false)
    expect(scaleTooLarge(1.5, FHD)).toBe(false)
  })
})

describe('suggestedScale', () => {
  it('uses the real viewport: a 75″ / 4 m board on a 1366×768 screen is not suggested ×1.5', () => {
    expect(suggestedScale(75, 4, LAPTOP)).toBeLessThanOrEqual(1.1)
    expect(suggestedScale(75, 4, FHD)).toBeGreaterThanOrEqual(1.2)
  })
  it('grows with distance and shrinks with a bigger screen, within the limits', () => {
    expect(suggestedScale(75, 8, UHD)).toBeGreaterThanOrEqual(suggestedScale(75, 2, UHD))
    expect(suggestedScale(86, 4, UHD)).toBeLessThanOrEqual(suggestedScale(55, 4, UHD))
    expect(suggestedScale(55, 9, UHD)).toBeLessThanOrEqual(2.6)
  })
  it('still accepts a plain CSS height', () => {
    expect(suggestedScale(75, 4, 1080)).toBe(suggestedScale(75, 4, { width: Infinity, height: 1080 }))
  })
})

describe('reach', () => {
  it('matches the geometry for a 75″ board with the bottom edge at 80 cm', () => {
    const r = reachFraction({ diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8' })
    expect(r).toBeGreaterThan(0.2)
    expect(r).toBeLessThan(0.3)
  })
  it('clamps to 0.15–0.8 and says when it did', () => {
    const low = { diagonalIn: 86, bottomEdgeM: 1.2, ageGroup: '3-4' as const }
    expect(reachRaw(low)).toBeLessThan(0.15)
    expect(reachFraction(low)).toBe(0.15)
    expect(reachClamp(low)).toBe('low')
    const high = { diagonalIn: 55, bottomEdgeM: 0.4, ageGroup: 'adult' as const }
    expect(reachFraction(high)).toBe(0.8)
    expect(reachClamp(high)).toBe('high')
    expect(reachClamp({ diagonalIn: 75, bottomEdgeM: 0.8, ageGroup: '5-8' })).toBeNull()
  })
})

describe('board mode without calibration (B20)', () => {
  it('defaultCalibration is sensible for the viewport', () => {
    const c = defaultCalibration(FHD)
    expect(c.scale).toBeGreaterThanOrEqual(1.2)
    expect(c.reach).toBeGreaterThanOrEqual(0.15)
    expect(defaultCalibration(LAPTOP).scale).toBeLessThanOrEqual(1.1)
  })
  it('switching board mode on stores a derived calibration, never runs with null', () => {
    useDevice.setState({ boardMode: false, boardCalibration: null })
    useDevice.getState().setBoardMode(true)
    const st = useDevice.getState()
    expect(st.boardMode).toBe(true)
    expect(st.boardCalibration).not.toBeNull()
    // An existing calibration is kept.
    const mine = { diagonalIn: 86, bottomEdgeM: 0.9, ageGroup: '9-12' as const, distanceM: 6, scale: 2, reach: 0.3 }
    useDevice.setState({ boardMode: false, boardCalibration: mine })
    useDevice.getState().setBoardMode(true)
    expect(useDevice.getState().boardCalibration).toEqual(mine)
    useDevice.setState({ boardMode: false, boardCalibration: null })
  })
})

describe('reach zone layout math', () => {
  const rem = 24 // 1920×1080 at ×1.5
  it('is the bottom share of the space above the bar', () => {
    expect(reachZoneHeight(1080, 0.45, rem)).toBeCloseTo((1080 - 7 * rem) * 0.45, 5)
    expect(reachZoneHeight(1080, 0.8, rem)).toBeGreaterThan(reachZoneHeight(1080, 0.45, rem))
  })
  it('never drops below 10 rem, so one row of big tiles always fits', () => {
    expect(reachZoneHeight(1080, 0.15, rem)).toBe(10 * rem)
  })
  it('moves the zone top accordingly: higher reach → zone starts higher', () => {
    const navTop = 1080 - 7 * rem
    const top = (r: number) => navTop - reachZoneHeight(1080, r, rem)
    expect(top(0.15)).toBeGreaterThan(top(0.4))
    expect(top(0.4)).toBeGreaterThan(top(0.8))
  })
})

describe('migrateDevice (saved state survives a version bump)', () => {
  const saved = {
    uiLang: 'ru',
    uzScript: 'latn',
    onboarded: true,
    activeProfileId: 'p1',
    boardMode: true,
    boardHintDismissed: true,
    boardCalibration: { diagonalIn: 86, bottomEdgeM: 0.7, ageGroup: '3-4', distanceM: 5, scale: 1.6, reach: 0.5 },
    parentPinHash: 'abc123',
  }

  it('keeps every known field from an older or newer version', () => {
    for (const v of [0, 1, 2, 7]) expect(migrateDevice({ ...saved, someFutureField: 1 }, v)).toEqual(saved)
  })

  it('never resets onboarded, the PIN or the calibration when a field is malformed or missing', () => {
    const m = migrateDevice({ onboarded: true, parentPinHash: 'h', boardCalibration: { diagonalIn: 65, scale: 'big' }, uiLang: 'xx' }, 3)
    expect(m.onboarded).toBe(true)
    expect(m.parentPinHash).toBe('h')
    expect(m.boardCalibration).toMatchObject({ diagonalIn: 65, ageGroup: '5-8', scale: 1 })
    expect(m.uiLang).toBe('uz')
  })

  it('returns defaults for garbage input', () => {
    expect(migrateDevice(null, 1)).toMatchObject({ onboarded: false, parentPinHash: null, boardCalibration: null, uiLang: 'uz' })
    expect(migrateDevice('nope', 1).uzScript).toBe('latn')
  })

  it('is used by the store: a version-0 blob is hydrated, not dropped', async () => {
    localStorage.setItem('gapimiz.device', JSON.stringify({ state: saved, version: 0 }))
    await useDevice.persist.rehydrate()
    expect(useDevice.getState().parentPinHash).toBe('abc123')
    expect(useDevice.getState().onboarded).toBe(true)
    expect(useDevice.getState().boardCalibration?.diagonalIn).toBe(86)
  })
})

describe('board preview', () => {
  const calib = { diagonalIn: 65, bottomEdgeM: 0.7, ageGroup: '3-4' as const, distanceM: 5, scale: 1.3, reach: 0.4 }
  it('shows the draft without storing it; cancel returns to the real settings, commit keeps the draft', () => {
    useDevice.setState({ boardMode: false, boardCalibration: null, boardPreviewBase: null })
    useDevice.getState().startBoardPreview(calib)
    expect(useDevice.getState()).toMatchObject({ boardMode: true, boardCalibration: calib })
    // storage keeps the pre-preview values
    expect(JSON.parse(localStorage.getItem('gapimiz.device') ?? '{}').state).toMatchObject({ boardMode: false, boardCalibration: null })
    useDevice.getState().cancelBoardPreview()
    expect(useDevice.getState()).toMatchObject({ boardMode: false, boardCalibration: null, boardPreviewBase: null })
    useDevice.getState().startBoardPreview(calib)
    useDevice.getState().commitBoardPreview()
    expect(useDevice.getState()).toMatchObject({ boardMode: true, boardCalibration: calib, boardPreviewBase: null })
    expect(JSON.parse(localStorage.getItem('gapimiz.device') ?? '{}').state).toMatchObject({ boardMode: true })
  })
  it('an explicit on/off choice ends a running preview', () => {
    useDevice.setState({ boardMode: false, boardCalibration: null, boardPreviewBase: null })
    useDevice.getState().startBoardPreview(calib)
    useDevice.getState().setBoardMode(false)
    expect(useDevice.getState()).toMatchObject({ boardMode: false, boardPreviewBase: null })
  })
})
