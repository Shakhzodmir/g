import { afterEach, describe, expect, it } from 'vitest'
import { inBoardMode, isPalm, isPalmContact } from './palm'

afterEach(() => {
  delete document.documentElement.dataset.board
})

describe('palm rejection (B10)', () => {
  it('a fingertip is fine, a palm or sleeve is not', () => {
    expect(isPalmContact({ width: 20, height: 22, pointerType: 'touch' })).toBe(false)
    expect(isPalmContact({ width: 41, height: 20, pointerType: 'touch' })).toBe(true)
    expect(isPalmContact({ width: 20, height: 90, pointerType: 'touch' })).toBe(true)
    expect(isPalmContact({ width: 70, height: 10, pointerType: 'touch' })).toBe(true)
  })
  it('mouse and pen report ~1 px and are never rejected', () => {
    expect(isPalmContact({ width: 1, height: 1, pointerType: 'mouse' })).toBe(false)
    expect(isPalmContact({ width: 1, height: 1, pointerType: 'pen' })).toBe(false)
  })
  it('the limit grows on wider (4K) boards', () => {
    expect(isPalmContact({ width: 60, height: 60, pointerType: 'touch' }, 1)).toBe(true)
    expect(isPalmContact({ width: 60, height: 60, pointerType: 'touch' }, 2)).toBe(false)
  })
  it('only applies in board mode', () => {
    const palm = { width: 120, height: 120, pointerType: 'touch' }
    expect(inBoardMode()).toBe(false)
    expect(isPalm(palm)).toBe(false)
    document.documentElement.dataset.board = 'true'
    expect(inBoardMode()).toBe(true)
    expect(isPalm(palm)).toBe(true)
    expect(isPalm({ width: 18, height: 18, pointerType: 'touch' })).toBe(false)
  })
})
