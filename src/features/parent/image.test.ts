import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('scales the longer side down to 512 px', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 512, height: 384 })
    expect(fitWithin(1080, 1920)).toEqual({ width: 288, height: 512 })
  })

  it('never upscales small images', () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 })
  })

  it('handles degenerate sizes', () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 })
    expect(fitWithin(10_000, 1)).toEqual({ width: 512, height: 1 })
  })
})
