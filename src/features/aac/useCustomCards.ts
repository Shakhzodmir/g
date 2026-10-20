import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import type { TopicId } from '../../content/types'
import { db, dbAvailable, type CustomCard } from '../../store/db'

async function loadCards(profileId: string): Promise<CustomCard[]> {
  if (!(await dbAvailable())) return []
  try {
    return await db.cards.where('profileId').equals(profileId).toArray()
  } catch {
    return []
  }
}

export interface ShownCard {
  card: CustomCard
  /** Object URL of the photo, when the card has one. */
  src?: string
}

/** The profile's own visible cards for one topic (stable order: oldest first), with photo object URLs. */
export function useCustomCards(profileId: string, topic: TopicId | null): ShownCard[] {
  const all = useLiveQuery(() => loadCards(profileId), [profileId])
  const cards = useMemo(
    () =>
      (all ?? [])
        .filter((c) => topic !== null && c.topic === topic && !c.hidden)
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
    [all, topic],
  )
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const made: Record<string, string> = {}
    for (const c of cards) if (c.image instanceof Blob) made[c.id] = URL.createObjectURL(c.image)
    setUrls(made)
    return () => Object.values(made).forEach((u) => URL.revokeObjectURL(u))
  }, [cards])
  return useMemo(() => cards.map((card) => ({ card, src: urls[card.id] })), [cards, urls])
}

/** How many visible own cards the profile has in each topic (for the tab labels; same filter as `useCustomCards`). */
export function useCustomCardCounts(profileId: string): ReadonlyMap<TopicId, number> {
  const all = useLiveQuery(() => loadCards(profileId), [profileId])
  return useMemo(() => {
    const counts = new Map<TopicId, number>()
    for (const c of all ?? []) if (!c.hidden) counts.set(c.topic, (counts.get(c.topic) ?? 0) + 1)
    return counts
  }, [all])
}
