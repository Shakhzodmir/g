import { describe, expect, it } from 'vitest'
import { isBigText } from './bigText'

describe('isBigText', () => {
  it('is off for normal text, the app text-size setting and board mode', () => {
    expect(isBigText(360, 16)).toBe(false)
    expect(isBigText(320, 16)).toBe(false)
    expect(isBigText(360, 20)).toBe(false) // 125 %
    expect(isBigText(1920, 24)).toBe(false) // board scale 1.5
    expect(isBigText(390, 16)).toBe(false)
  })
  it('is on for 150 % text and more on a phone', () => {
    expect(isBigText(360, 24)).toBe(true)
    expect(isBigText(360, 32)).toBe(true)
    expect(isBigText(320, 24)).toBe(true)
  })
})
