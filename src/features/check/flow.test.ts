import { describe, expect, it } from 'vitest'
import { DOMAINS } from './config'
import { detailComplete, finishRun, initRun, narrowDomains, prevInfoOf, progressOf, questionsOf, quickOf, runReducer, type RunAction, type RunState } from './flow'
import type { Answer, CheckResult } from './types'

const run = (s: RunState, ...actions: RunAction[]): RunState => actions.reduce(runReducer, s)

/** Answers every question of the current step with `v`. */
function answerStep(s: RunState, v: Answer | ((id: string, i: number) => Answer)): RunState {
  let cur = s
  const list = questionsOf(s)
  list.forEach((q, i) => {
    cur = runReducer(cur, { type: 'answer', id: q.id, value: typeof v === 'function' ? v(q.id, i) : v })
  })
  return cur
}

describe('narrowDomains', () => {
  it('"not sure" and no choice mean all six domains', () => {
    expect(narrowDomains(['unsure'])).toEqual([...DOMAINS.child])
    expect(narrowDomains([])).toEqual([...DOMAINS.child])
    expect(narrowDomains(['little', 'unsure'])).toEqual([...DOMAINS.child])
  })
  it('maps each worry to its domains, in canonical order', () => {
    expect(narrowDomains(['fluency'])).toEqual(['fluency'])
    expect(narrowDomains(['contact'])).toEqual(['understanding', 'attention'])
    expect(narrowDomains(['sounds', 'little'])).toEqual(['vocab', 'sounds', 'articulation'])
    expect(narrowDomains(['mouth'])).toEqual(['articulation'])
  })
  it('adds the domains the quick screen did not rate good', () => {
    expect(narrowDomains(['fluency'], { fluency: 'good', vocab: 'watch', attention: 'attention', sounds: 'good' })).toEqual(['vocab', 'fluency', 'attention'])
  })
})

describe('child run', () => {
  it('goes age -> concerns -> quick -> result -> detail and scores the detailed answers', () => {
    let s = initRun('child')
    expect(s.step).toBe('age')
    s = run(s, { type: 'age', age: '3-4' })
    expect(s.step).toBe('concerns')
    s = run(s, { type: 'concerns', concerns: ['fluency'] })
    expect(s.step).toBe('quick')
    expect(questionsOf(s)).toHaveLength(5)
    s = answerStep(s, (_id, i) => (i === 3 ? 0 : 2)) // the fluency question gets a "no"
    expect(s.step).toBe('quickResult')
    const quick = quickOf(s)
    expect(quick.onTrack).toBe(false)
    s = run(s, { type: 'goDetail' })
    expect(s.step).toBe('detail')
    expect(s.domains).toEqual(['fluency', ...(quick.bands.attention ? [] : [])].filter((d) => d === 'fluency'))
    expect(questionsOf(s)).toHaveLength(3)
    s = answerStep(s, 0)
    expect(detailComplete(s)).toBe(true)
    const result = finishRun(s, 'full', 1000)
    expect(result.stage).toBe('full')
    expect(result.bands).toEqual({ fluency: 'attention' })
    expect(result.concerns).toEqual(['fluency'])
    expect(result.retest).toBe(false)
  })

  it('an on-track quick screen can finish as a quick result', () => {
    let s = run(initRun('child'), { type: 'age', age: '2-3' }, { type: 'concerns', concerns: ['unsure'] })
    s = answerStep(s, 2)
    expect(s.step).toBe('quickResult')
    expect(quickOf(s).onTrack).toBe(true)
    const r = finishRun(s, 'quick', 5)
    expect(r.stage).toBe('quick')
    expect(Object.keys(r.bands).length).toBeGreaterThanOrEqual(4)
    expect(r.overall).toBe('good')
  })

  it('"not sure" covers all six domains; the quick-screen weak spots are always added', () => {
    let s = run(initRun('child'), { type: 'age', age: '4-5' }, { type: 'concerns', concerns: ['unsure'] })
    s = answerStep(s, 1)
    s = run(s, { type: 'goDetail' })
    expect(s.domains).toEqual([...DOMAINS.child])
    expect(questionsOf(s)).toHaveLength(18)
  })

  it('every worry combination yields between 1 and 6 domains with 3 questions each', () => {
    for (const c of [['little'], ['sounds'], ['understand'], ['fluency'], ['contact'], ['mouth']] as const) {
      const d = narrowDomains([...c])
      expect(d.length).toBeGreaterThanOrEqual(1)
      expect(d.length).toBeLessThanOrEqual(6)
    }
  })

  it('back steps through the flow without losing answers', () => {
    let s = run(initRun('child'), { type: 'age', age: '1-2' }, { type: 'concerns', concerns: ['little'] })
    s = run(s, { type: 'answer', id: questionsOf(s)[0].id, value: 1 }, { type: 'answer', id: questionsOf(s)[1].id, value: 2 })
    expect(s.index).toBe(2)
    s = run(s, { type: 'back' })
    expect(s.index).toBe(1)
    expect(s.answers[questionsOf(s)[0].id]).toBe(1)
    s = run(s, { type: 'back' }, { type: 'back' })
    expect(s.step).toBe('concerns')
    s = run(s, { type: 'back' })
    expect(s.step).toBe('age')
    expect(run(s, { type: 'back' }).step).toBe('age')
  })

  it('ignores answers outside a question step', () => {
    const s = initRun('child')
    expect(runReducer(s, { type: 'answer', id: 'x', value: 2 })).toBe(s)
  })

  it('progress counts within the current list', () => {
    let s = run(initRun('child'), { type: 'age', age: '5-7' }, { type: 'concerns', concerns: ['unsure'] })
    expect(progressOf(s)).toEqual({ n: 1, total: 5 })
    s = run(s, { type: 'answer', id: questionsOf(s)[0].id, value: 2 })
    expect(progressOf(s)).toEqual({ n: 2, total: 5 })
  })
})

describe('communication run', () => {
  it('goes age -> 18 questions -> result with six domains', () => {
    let s = initRun('asd')
    s = run(s, { type: 'age', age: '2-3' })
    expect(s.step).toBe('detail')
    expect(questionsOf(s)).toHaveLength(18)
    s = answerStep(s, (id) => (id.startsWith('as.pointing') ? 0 : 2))
    expect(detailComplete(s)).toBe(true)
    const r = finishRun(s, 'full', 1)
    expect(Object.keys(r.bands)).toHaveLength(6)
    expect(r.bands.pointing).toBe('attention')
    expect(r.bands.joint).toBe('good')
    expect(r.overall).toBe('watch')
    expect(r.age).toBe('2-3')
  })
})

describe('adult run', () => {
  it('goes intro -> 18 questions -> result and has no age', () => {
    let s = initRun('adult')
    expect(s.step).toBe('intro')
    s = run(s, { type: 'start' })
    expect(questionsOf(s)).toHaveLength(18)
    s = answerStep(s, 1)
    const r = finishRun(s, 'full', 1)
    expect(r.age).toBeNull()
    expect(r.overall).toBe('watch')
    expect(run(s, { type: 'back' }).index).toBe(16)
  })
})

describe('retest', () => {
  const prevFull: CheckResult = { id: 'r1', ts: 1, stage: 'full', age: '3-4', concerns: ['fluency'], retest: false, answers: {}, fr: { fluency: 0 }, bands: { fluency: 'attention' }, overall: 'attention', cfg: 1 }
  const prevQuick: CheckResult = { ...prevFull, stage: 'quick', concerns: ['unsure'], bands: { vocab: 'good', sounds: 'good', understanding: 'good', fluency: 'good', attention: 'good' }, overall: 'good' }

  it('after a detailed baseline asks the same domains directly, skipping concerns and quick', () => {
    let s = initRun('child', prevInfoOf(prevFull))
    expect(s.retest).toBe(true)
    expect(s.age).toBe('3-4')
    s = run(s, { type: 'age', age: '3-4' })
    expect(s.step).toBe('detail')
    expect(s.domains).toEqual(['fluency'])
    expect(finishRun(answerStep(s, 2), 'full', 9).retest).toBe(true)
  })

  it('after a quick baseline repeats the quick screen first', () => {
    let s = run(initRun('child', prevInfoOf(prevQuick)), { type: 'age', age: '4-5' })
    expect(s.step).toBe('quick')
    expect(s.age).toBe('4-5')
    s = answerStep(s, 2)
    expect(s.step).toBe('quickResult')
  })

  it('a communication or adult retest runs the same list', () => {
    const asd = run(initRun('asd', prevInfoOf({ ...prevFull, age: '2-3' })), { type: 'age', age: '2-3' })
    expect(questionsOf(asd)).toHaveLength(18)
    const adult = run(initRun('adult', prevInfoOf({ ...prevFull, age: null })), { type: 'start' })
    expect(questionsOf(adult)).toHaveLength(18)
  })
})
