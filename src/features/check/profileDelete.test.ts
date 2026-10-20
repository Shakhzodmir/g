import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, resetDbAvailability } from '../../store/db'
import { defaultProfile, useProfileStore } from '../../store/profile'
import { clearAllLocalState, clearProfileLocalState } from '../profileState'
import { addResult, emptyRow } from './model'
import { putRow } from './repo'
import { adultQuestions } from './questions'
import { buildResult } from './scoring'
import { useCheckStore } from './store'

const result = () => {
  const qs = adultQuestions()
  return buildResult({ ts: 1000, stage: 'full', age: null, concerns: [], retest: false, questions: qs, answers: Object.fromEntries(qs.map((q) => [q.id, 1 as const])) })
}

describe('deleting a profile removes its speech checks', () => {
  beforeEach(async () => {
    resetDbAvailability()
    await db.open()
    await db.checks.clear()
    useProfileStore.setState({ profile: defaultProfile(), profiles: [], loaded: false, persistent: false })
    useCheckStore.setState({ rows: {} })
  })
  afterEach(() => {
    resetDbAvailability()
  })

  it('profile store remove() deletes the rows of that profile only', async () => {
    const a = await useProfileStore.getState().create({ name: 'A' })
    const b = await useProfileStore.getState().create({ name: 'B' })
    await putRow(addResult(emptyRow(a.id, 'adult'), result()))
    await putRow(addResult(emptyRow(a.id, 'child'), result()))
    await putRow(addResult(emptyRow(b.id, 'adult'), result()))
    expect(await db.checks.count()).toBe(3)
    await useProfileStore.getState().remove(a.id)
    expect((await db.checks.toArray()).map((r) => r.id)).toEqual([`${b.id}:adult`])
  })

  it('the in-memory copy is forgotten for one profile or for all', async () => {
    await useCheckStore.getState().saveResult('pa', 'adult', result())
    await useCheckStore.getState().saveResult('pb', 'adult', result())
    expect(Object.keys(useCheckStore.getState().rows).sort()).toEqual(['pa:adult', 'pb:adult'])
    clearProfileLocalState('pa')
    expect(Object.keys(useCheckStore.getState().rows)).toEqual(['pb:adult'])
    clearAllLocalState(['pb'])
    expect(useCheckStore.getState().rows).toEqual({})
  })

  it('the store writes through to the table and hydrates a profile back from it', async () => {
    await useCheckStore.getState().saveResult('pz', 'child', result())
    await useCheckStore.getState().tick('pz', 'child', '2026-10-20', 'child.vocab.t1')
    useCheckStore.setState({ rows: {} })
    await useCheckStore.getState().hydrate('pz')
    const row = useCheckStore.getState().rows['pz:child']
    expect(row.results).toHaveLength(1)
    expect(row.ticks['2026-10-20']).toEqual(['child.vocab.t1'])
    await useCheckStore.getState().removeKind('pz', 'child')
    expect(await db.checks.count()).toBe(0)
    expect(useCheckStore.getState().rows['pz:child']).toBeUndefined()
  })
})
