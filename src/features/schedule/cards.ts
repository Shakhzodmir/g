import { useEffect, useMemo, useState } from 'react'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'
import { STICKERS } from '../../content/stickers'
import type { Fitz } from '../../content/types'
import { VOICE_LINES } from '../../content/voiceLines'
import { wordById, wordsByTopic } from '../../content/vocab'
import type { SpeakItem } from '../../audio/speech'
import type { Bi } from '../../i18n/types'
import { db, dbAvailable, type CustomCard } from '../../store/db'
import { useProfileStore } from '../../store/profile'

/*
 * A "card ref" points at something with a picture and a spoken label:
 *  - a vocabulary word id (`water`),
 *  - a custom card (`c.<id>`, photo or symbol, from db.cards),
 *  - a sticker (`st.<id>`), used as a token-board reward.
 */

export interface CardView {
  ref: string
  label: Bi
  symbol: string
  /** Object URL of a custom photo, if any. */
  photo?: string
  fitz: Fitz
  speech: SpeakItem
}

export type CustomCardMap = Map<string, CustomCard & { photo?: string }>

export function resolveCard(ref: string, custom?: CustomCardMap): CardView | null {
  if (ref.startsWith('c.')) {
    const c = custom?.get(ref.slice(2))
    if (!c) return null
    const label = { uz: c.uz, ru: c.ru }
    return { ref, label, symbol: c.symbol ?? 'framed_picture', photo: c.photo, fitz: c.fitz, speech: { key: ref, text: label } }
  }
  if (ref.startsWith('st.')) {
    const s = STICKERS.find((x) => x.id === ref.slice(3))
    if (!s) return null
    const label = { uz: s.uz, ru: s.ru }
    return { ref, label, symbol: s.symbol, fitz: 'thing', speech: { key: `sticker.${s.id}`, text: label } }
  }
  const w = wordById(ref)
  if (!w) return null
  const label = { uz: w.uz, ru: w.ru }
  return { ref, label, symbol: w.symbol, fitz: w.fitz, speech: { key: `w.${w.id}`, text: label } }
}

/** Spoken item for a fixed voice line (`v.<id>`). */
export function voice(id: string): SpeakItem {
  const l = VOICE_LINES.find((x) => x.id === id)
  return { key: `v.${id}`, text: l ? { uz: l.uz, ru: l.ru } : { uz: id, ru: id } }
}

/** Activities that make sense in a daily schedule: template items first, then the rest of the "time" topic. */
export function scheduleActivityRefs(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (id: string) => {
    if (!seen.has(id) && wordById(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  for (const t of SCHEDULE_TEMPLATES) t.items.forEach(push)
  for (const w of wordsByTopic('time')) if (w.fitz === 'action') push(w.id)
  for (const id of ['toilet', 'lesson', 'eat', 'drink', 'draw', 'cartoon', 'music', 'park', 'shop', 'doctor', 'hospital', 'barbershop', 'pool', 'bus']) push(id)
  return out
}

/** The profile's custom cards (with object URLs for photos), loaded once per profile. */
export function useCustomCards(): CustomCardMap {
  const profileId = useProfileStore((s) => s.profile.id)
  const [cards, setCards] = useState<CustomCardMap>(() => new Map())
  useEffect(() => {
    let alive = true
    const urls: string[] = []
    void (async () => {
      if (!(await dbAvailable())) return
      try {
        const rows = await db.cards.where('profileId').equals(profileId).toArray()
        if (!alive) return
        const map: CustomCardMap = new Map()
        for (const r of rows) {
          if (r.hidden) continue
          let photo: string | undefined
          if (r.image) {
            photo = URL.createObjectURL(r.image)
            urls.push(photo)
          }
          map.set(r.id, { ...r, photo })
        }
        setCards(map)
      } catch {
        /* no custom cards */
      }
    })()
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [profileId])
  return cards
}

/** Resolves a list of refs, dropping ones that no longer exist (e.g. a deleted custom card). */
export function useCardViews(refs: string[], custom: CustomCardMap): Array<CardView | null> {
  const key = refs.join('|')
  return useMemo(() => refs.map((r) => resolveCard(r, custom)), [key, custom])
}
