import { describe, expect, it } from 'vitest'
import { NUMBER_LINES, VOICE_LINES } from '../../content/voiceLines'
import { addToken, clampGoal, createBoard, isComplete, remaining, remainingSpeechIds, resetBoard, setGoal, setReward } from './tokenLogic'

describe('token board', () => {
  it('adds tokens up to the goal and then stays complete', () => {
    let b = createBoard(3, 'st.anor')
    expect(remaining(b)).toBe(3)
    b = addToken(addToken(b))
    expect(b.count).toBe(2)
    expect(isComplete(b)).toBe(false)
    b = addToken(b)
    expect(isComplete(b)).toBe(true)
    expect(remaining(b)).toBe(0)
    expect(addToken(b)).toBe(b)
  })

  it('resets to zero but keeps goal and reward', () => {
    const b = addToken(addToken(createBoard(4, 'water')))
    const r = resetBoard(b)
    expect(r).toEqual({ goal: 4, count: 0, rewardRef: 'water' })
    expect(resetBoard(r)).toBe(r)
  })

  it('clamps the goal to 3–10 and keeps earned stars within it', () => {
    expect(clampGoal(1)).toBe(3)
    expect(clampGoal(12)).toBe(10)
    expect(createBoard(99).goal).toBe(10)
    const b = { goal: 8, count: 7, rewardRef: null }
    expect(setGoal(b, 5)).toEqual({ goal: 5, count: 5, rewardRef: null })
    expect(setGoal(b, 10).count).toBe(7)
    expect(setReward(b, 'st.kite').rewardRef).toBe('st.kite')
  })

  it('speaks the remaining count with the right Russian plural', () => {
    expect(remainingSpeechIds(4, 'uz')).toEqual(['v.tok_more', 'n.4', 'v.tok_star_count'])
    expect(remainingSpeechIds(3, 'ru')).toEqual(['v.tok_more', 'n.3', 'v.tok_star_few'])
    expect(remainingSpeechIds(5, 'ru')).toEqual(['v.tok_more', 'n.5', 'v.tok_star_many'])
    expect(remainingSpeechIds(1, 'ru')).toEqual(['v.tok_one_more'])
    expect(remainingSpeechIds(0, 'uz')).toEqual(['v.tok_full', 'v.tok_reward'])
  })

  it('only uses voice lines and numbers that exist', () => {
    const known = new Set([...VOICE_LINES.map((l) => `v.${l.id}`), ...NUMBER_LINES.map((l) => `n.${l.id.replace('num_', '')}`)])
    for (let left = 0; left <= 10; left++) {
      for (const lang of ['uz', 'ru'] as const) for (const id of remainingSpeechIds(left, lang)) expect(known.has(id), id).toBe(true)
    }
  })
})
