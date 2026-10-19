import { describe, expect, it } from 'vitest'
import { STORIES } from '../../content/stories'
import { canGoNext, canGoPrev, clampPage, isLastPage, nextPage, prevPage, storyPageKey, swipeDirection } from './nav'

describe('story page navigation', () => {
  it('stays inside the story', () => {
    expect(clampPage(-3, 5)).toBe(0)
    expect(clampPage(9, 5)).toBe(4)
    expect(clampPage(2.7, 5)).toBe(2)
    expect(clampPage(Number.NaN, 5)).toBe(0)
    expect(clampPage(3, 0)).toBe(0)
  })

  it('does not move past the first or last page', () => {
    expect(prevPage(0, 5)).toBe(0)
    expect(nextPage(4, 5)).toBe(4)
    expect(nextPage(1, 5)).toBe(2)
    expect(prevPage(3, 5)).toBe(2)
  })

  it('knows when prev/next are available and when the story ends', () => {
    expect(canGoPrev(0, 5)).toBe(false)
    expect(canGoPrev(1, 5)).toBe(true)
    expect(canGoNext(4, 5)).toBe(false)
    expect(canGoNext(3, 5)).toBe(true)
    expect(isLastPage(4, 5)).toBe(true)
    expect(isLastPage(3, 5)).toBe(false)
    expect(isLastPage(0, 1)).toBe(true)
    expect(canGoNext(0, 0)).toBe(false)
    expect(isLastPage(0, 0)).toBe(false)
  })

  it('builds page audio keys', () => {
    expect(storyPageKey('doctor', 0)).toBe('st.doctor.0')
  })

  it('walks every bundled story from the first to the last page', () => {
    for (const s of STORIES) {
      let i = 0
      let steps = 0
      while (canGoNext(i, s.pages.length)) {
        i = nextPage(i, s.pages.length)
        steps++
      }
      expect(steps).toBe(s.pages.length - 1)
      expect(isLastPage(i, s.pages.length)).toBe(true)
    }
  })
})

describe('swipeDirection', () => {
  it('turns pages only on a clear sideways swipe', () => {
    expect(swipeDirection(-120, 10)).toBe('next')
    expect(swipeDirection(120, -5)).toBe('prev')
    expect(swipeDirection(-30, 0)).toBeNull()
    expect(swipeDirection(-100, 90)).toBeNull()
    expect(swipeDirection(0, 200)).toBeNull()
  })
})
