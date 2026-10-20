import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { topicsForKind } from '../../content/topics'
import { WORDS } from '../../content/vocab'
import { defaultProfile, useProfileStore } from '../../store/profile'
import { CoreBoard, TopicBoard } from './Boards'
import { topicCardCount } from './tabs'
import { TopicTabs, type TabItem } from './TopicTabs'

const noop = () => undefined
const aac = (over: Partial<ReturnType<typeof defaultProfile>['aac']> = {}) => ({ ...defaultProfile().aac, ...over })

describe('the number on a topic tab is the number of cards on its board', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: defaultProfile() })
  })

  for (const kind of ['child', 'adult'] as const) {
    it(`${kind}: every topic tab count equals the cards drawn`, () => {
      const settings = aac({ level: 3 })
      for (const topic of topicsForKind(kind)) {
        const { unmount } = render(
          <MemoryRouter>
            {topic.id === 'core' ? (
              <CoreBoard kind={kind} aac={settings} onTap={noop} glowKey={null} name={topic.id} />
            ) : (
              <TopicBoard kind={kind} topic={topic.id} profileId="p" aac={settings} onTap={noop} glowKey={null} name={topic.id} />
            )}
          </MemoryRouter>,
        )
        const drawn = screen.queryAllByRole('button').length
        expect(topicCardCount(kind, topic.id, settings), `${kind}/${topic.id}`).toBe(drawn)
        unmount()
      }
    }, 60_000)
  }

  it('hidden words are not counted (they leave an empty place on the board)', () => {
    const food = WORDS.filter((w) => w.topic === 'food' && (!w.audience || w.audience === 'both' || w.audience === 'child'))
    const hiddenWordIds = food.slice(0, 3).map((w) => w.id)
    const settings = aac({ level: 3, hiddenWordIds })
    expect(topicCardCount('child', 'food', settings)).toBe(topicCardCount('child', 'food', aac({ level: 3 })) - 3)
    const { unmount } = render(<TopicBoard kind="child" topic="food" profileId="p" aac={settings} onTap={noop} glowKey={null} name="food" />)
    expect(screen.queryAllByRole('button').length).toBe(topicCardCount('child', 'food', settings))
    unmount()
  })

  it('the core tab follows the AAC level (9 / 18 / 36) and own cards add to a topic', () => {
    expect(topicCardCount('child', 'core', aac({ level: 1 }))).toBe(9)
    expect(topicCardCount('child', 'core', aac({ level: 2 }))).toBe(18)
    expect(topicCardCount('child', 'core', aac({ level: 3 }))).toBe(36)
    expect(topicCardCount('child', 'food', aac(), 2)).toBe(topicCardCount('child', 'food', aac()) + 2)
  })

  it('no topic of either kind is empty, so no tab promises nothing', () => {
    for (const kind of ['child', 'adult'] as const) for (const t of topicsForKind(kind)) expect(topicCardCount(kind, t.id, aac({ level: 3 })), `${kind}/${t.id}`).toBeGreaterThan(0)
  })
})

describe('TopicTabs', () => {
  const tabs: TabItem[] = Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, label: `Mavzu ${i}`, symbol: 'star', count: i === 0 ? undefined : i + 5 }))
  const sizes = { scrollWidth: 4000, clientWidth: 300, scrollLeft: 0 }

  beforeEach(() => {
    for (const [k, v] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v, set: () => undefined })
    HTMLElement.prototype.scrollBy = vi.fn()
    HTMLElement.prototype.scrollTo = vi.fn()
  })
  afterEach(() => {
    for (const k of Object.keys(sizes)) Reflect.deleteProperty(HTMLElement.prototype, k)
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  })

  it('keeps every topic reachable and spells the card count into the accessible name', () => {
    render(<TopicTabs tabs={tabs} activeId="t0" onSelect={noop} hy="uz" />)
    const nav = screen.getByRole('navigation', { name: 'Mavzular' })
    const buttons = nav.querySelectorAll('button')
    expect(buttons).toHaveLength(30)
    expect(screen.getByRole('button', { name: 'Mavzu 4, 9 ta soʻz'.replace('ʻ', '‘') })).toBeInTheDocument()
    // the first tab has no count (not a topic): its name is just the label
    expect(screen.getByRole('button', { name: 'Mavzu 0' })).toBeInTheDocument()
  })

  it('shows a "more" arrow while there is more to scroll, and it moves the strip', () => {
    render(<TopicTabs tabs={tabs} activeId="t0" onSelect={noop} hy="uz" />)
    const more = screen.getByRole('button', { name: 'Yana mavzular' })
    expect(screen.queryByRole('button', { name: 'Oldingi mavzular' })).toBeNull()
    fireEvent.click(more)
    expect(HTMLElement.prototype.scrollBy).toHaveBeenCalled()
  })

  it('the chosen tab is pressed and selecting another reports its id', () => {
    const onSelect = vi.fn()
    render(<TopicTabs tabs={tabs} activeId="t3" onSelect={onSelect} hy="uz" />)
    expect(screen.getByRole('button', { name: /^Mavzu 3,/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Mavzu 5,/ }))
    expect(onSelect).toHaveBeenCalledWith('t5')
  })

  it('no arrows when everything fits', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 300 })
    render(<TopicTabs tabs={tabs.slice(0, 2)} activeId="t0" onSelect={noop} hy="uz" />)
    expect(screen.queryByRole('button', { name: 'Yana mavzular' })).toBeNull()
  })
})
