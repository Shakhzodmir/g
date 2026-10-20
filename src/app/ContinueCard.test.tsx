import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { saveLevel } from '../features/games/logic/levelKey'
import { db, resetDbAvailability } from '../store/db'
import { logEvent, recentEvents, resetEventMemory } from '../store/events'
import { defaultProfile, useProfileStore } from '../store/profile'
import { ContinueCard, useResume } from './ContinueCard'

function Where() {
  const l = useLocation()
  return <p data-testid="where">{l.pathname + l.search}</p>
}

function Probe() {
  const resume = useResume()
  return <ContinueCard variant="child" resume={resume} />
}

function ProbeAdult() {
  const resume = useResume()
  return <ContinueCard variant="adult" resume={resume} />
}

const show = (adult = false) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={adult ? <ProbeAdult /> : <Probe />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )

const setProfile = (kind: 'child' | 'adult', id = 'p1') => useProfileStore.setState({ profile: { ...defaultProfile({ kind }), id } })

beforeEach(async () => {
  resetDbAvailability()
  resetEventMemory()
  await db.events.clear()
  setProfile('child')
})
afterEach(() => {
  resetDbAvailability()
})

describe('events log: recentEvents', () => {
  it('returns the newest events of one profile first and honours the limit', async () => {
    await db.events.bulkAdd([
      { profileId: 'p1', type: 'game_round', ref: 'find', ts: 1000 },
      { profileId: 'p2', type: 'game_round', ref: 'memory', ts: 5000 },
      { profileId: 'p1', type: 'game_round', ref: 'syllables', ts: 3000 },
      { profileId: 'p1', type: 'exercise', ref: 'blow', ts: 2000 },
    ])
    expect((await recentEvents('p1', 10)).map((e) => e.ref)).toEqual(['syllables', 'blow', 'find'])
    expect((await recentEvents('p1', 2)).map((e) => e.ref)).toEqual(['syllables', 'blow'])
    expect(await recentEvents('nobody')).toEqual([])
  })
})

describe('ContinueCard', () => {
  it('shows nothing for a profile that has not done anything yet', async () => {
    show()
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByTestId('continue')).toBeNull()
  })

  it('offers the last game with its name and the level, and opens it', async () => {
    await db.events.bulkAdd([
      { profileId: 'p1', type: 'game_round', ref: 'find', ts: 1000, meta: { ok: true, level: 1 } },
      { profileId: 'p1', type: 'game_round', ref: 'syllables', ts: 2000, meta: { ok: true, level: 2 } },
    ])
    saveLevel('p1', 'syllables', 3)
    show()
    const btn = await screen.findByRole('button', { name: /Davom etamiz: Chapak-chapak/ })
    // the game opens on the level the child chose last (3), not the one of the logged round
    expect(btn).toHaveAccessibleName('Davom etamiz: Chapak-chapak, Oʻyin · 3-daraja'.replace('ʻ', '‘'))
    btn.click()
    expect(await screen.findByTestId('where')).toHaveTextContent('/games/syllables')
  })

  it('other profiles\' events never leak in', async () => {
    await db.events.add({ profileId: 'p2', type: 'game_round', ref: 'memory', ts: 9000 })
    show()
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByTestId('continue')).toBeNull()
  })

  it('goes back to the talk board the child used last', async () => {
    await db.events.add({ profileId: 'p1', type: 'aac_word', ref: 'water', ts: 1000 })
    show()
    const btn = await screen.findByRole('button', { name: /^Davom etamiz:/ })
    btn.click()
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/talk(\?topic=\w+)?$/)
  })

  it('an adult profile gets the compact row and never a child-only game', async () => {
    setProfile('adult', 'a1')
    await db.events.bulkAdd([
      { profileId: 'a1', type: 'game_round', ref: 'naming', ts: 1000, meta: { level: 1 } },
      { profileId: 'a1', type: 'game_round', ref: 'animals', ts: 2000, meta: { level: 1 } },
    ])
    show(true)
    const card = await screen.findByTestId('continue')
    expect(card).toHaveAttribute('data-variant', 'adult')
    expect(screen.getByRole('button', { name: /Nomlash/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kim nima deydi/ })).toBeNull()
  })

  it('works through logEvent without IndexedDB writes finishing first (memory fallback + db)', async () => {
    logEvent('game_round', 'memory', { ok: true, level: 2 })
    await waitFor(async () => expect((await recentEvents('p1', 5)).map((e) => e.ref)).toContain('memory'))
    show()
    expect(await screen.findByRole('button', { name: /Juftini top/ })).toBeInTheDocument()
  })

  it('a mirror pose (lazy pose data) leads back to that pose', async () => {
    await db.events.add({ profileId: 'p1', type: 'exercise', ref: 'smile', ts: 1000 })
    show()
    const btn = await screen.findByRole('button', { name: /Davom etamiz: Tabassum/ })
    btn.click()
    expect(await screen.findByTestId('where')).toHaveTextContent('/exercises/mirror/smile')
  })

  it('is one big target whose name starts with the visible words', async () => {
    await db.events.add({ profileId: 'p1', type: 'exercise', ref: 'blow', ts: 1000 })
    show()
    const btn = await screen.findByRole('button')
    // WCAG 2.5.3 label in name: the visible kicker and title are in the accessible name
    expect(btn.textContent).toContain('Davom etamiz')
    expect(btn.getAttribute('aria-label') ?? btn.textContent).toContain('Davom etamiz')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
