import { describe, expect, it } from 'vitest'
import { cropFrame, fitWithin } from './image'

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

describe('cropFrame', () => {
  it('keeps normal photos whole', () => {
    expect(cropFrame(4032, 3024)).toEqual({ sx: 0, sy: 0, sw: 4032, sh: 3024 })
    expect(cropFrame(1080, 1920)).toEqual({ sx: 0, sy: 240, sw: 1080, sh: 1440 }) // 9:16 is more extreme than 3:4
    expect(cropFrame(1000, 1000)).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 1000 })
  })

  it('centre-crops a panorama to 4:3 instead of squashing it into a strip', () => {
    const c = cropFrame(12000, 400)
    expect(c).toEqual({ sx: 5734, sy: 0, sw: 533, sh: 400 })
    expect(fitWithin(c.sw, c.sh)).toEqual({ width: 512, height: 384 })
  })

  it('centre-crops a tall strip', () => {
    const c = cropFrame(400, 12000)
    expect(c.sh).toBe(533)
    expect(c.sw).toBe(400)
    expect(c.sy).toBe(5734)
  })
})
