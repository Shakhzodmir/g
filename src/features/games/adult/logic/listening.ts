import {
  adultItems,
  CATS,
  catItems,
  COMMANDS,
  LOCS,
  PLACE_Q,
  QA,
  refItem,
  YESNO,
  type BiTts,
  type CatId,
  type GItem,
  type PlaceOption,
} from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, pickDistinct, shuffle, type Rand } from './common'

/*
 * Listening comprehension. The prompt is only SPOKEN (with a "hear again" button and the same words as text for
 * people who read better than they hear).
 *  level 1: "which one is a drink?" and "show me the apple" (3 pictures)
 *  level 2: function questions (4 pictures), where-is questions and yes/no questions
 *  level 3: two-step commands (6 pictures, in order) mixed with where-is questions
 */

export type ListenItem =
  | { kind: 'cat'; id: string; prompt: BiTts; key: string; options: GItem[]; answer: string }
  | { kind: 'word'; id: string; prompt: BiTts; key: string; options: GItem[]; answer: string }
  | { kind: 'qa'; id: string; prompt: BiTts; key: string; options: GItem[]; answer: string }
  | { kind: 'place'; id: string; prompt: BiTts; key: string; places: [PlaceOption, PlaceOption]; answer: string }
  | { kind: 'yesno'; id: string; prompt: BiTts; key: string; yes: boolean }
  | { kind: 'command'; id: string; prompt: BiTts; key: string; options: GItem[]; order: [string, string] }

const wordPrompt = (it: GItem): BiTts => ({ uz: it.uz, ru: it.ru, ruTts: it.ruTts })

function catItem(rand: Rand, prev?: CatId): ListenItem | null {
  const cats = CATS.filter((c) => catItems(c.id).length >= 3 && c.id !== prev)
  const cat = shuffle(cats, rand)[0]
  if (!cat) return null
  const right = shuffle(catItems(cat.id), rand)[0]
  const wrong = pickDistinct(
    shuffle(adultItems().filter((i) => !i.cats.includes(cat.id) && !i.cats.some((c) => cat.near.includes(c))), rand),
    2,
    [right],
  )
  if (wrong.length < 2) return null
  return { kind: 'cat', id: `cat_${cat.id}_${right.id}`, prompt: cat.q, key: `g.ad.q.${cat.id}`, options: shuffle([right, ...wrong], rand), answer: right.id }
}

function wordItem(rand: Rand, avoid: Set<string>): ListenItem | null {
  const pool = adultItems().filter((i) => !avoid.has(i.id))
  const right = shuffle(pool, rand)[0]
  if (!right) return null
  const wrong = pickDistinct(shuffle(pool, rand), 2, [right])
  return { kind: 'word', id: `word_${right.id}`, prompt: wordPrompt(right), key: right.key, options: shuffle([right, ...wrong], rand), answer: right.id }
}

function qaItems(rand: Rand): ListenItem[] {
  const out: ListenItem[] = []
  for (const q of QA) {
    const right = refItem(q.answer)
    const wrong = q.others.map(refItem).filter((x): x is GItem => !!x)
    if (!right) continue
    const picked = pickDistinct(shuffle(wrong, rand), 3, [right])
    if (picked.length < 2) continue
    out.push({ kind: 'qa', id: `qa_${q.id}`, prompt: q.q, key: `g.ad.l.${q.id}`, options: shuffle([right, ...picked], rand), answer: right.id })
  }
  return out
}

function placeItems(rand: Rand): ListenItem[] {
  return PLACE_Q.map((p) => {
    const places = shuffle([LOCS[p.answer], LOCS[p.other]], rand) as [PlaceOption, PlaceOption]
    return { kind: 'place' as const, id: `place_${p.id}`, prompt: p.text, key: `g.ad.l.${p.id}`, places, answer: p.answer }
  })
}

function yesNoItems(): ListenItem[] {
  return YESNO.map((y) => ({ kind: 'yesno' as const, id: `yn_${y.id}`, prompt: y.q, key: `g.ad.l.${y.id}`, yes: y.yes }))
}

function commandItems(rand: Rand): ListenItem[] {
  const out: ListenItem[] = []
  for (const c of COMMANDS) {
    const a = refItem(c.a)
    const b = refItem(c.b)
    if (!a || !b) continue
    const extra = pickDistinct(shuffle(adultItems(), rand), 4, [a, b])
    out.push({ kind: 'command', id: `cmd_${c.id}`, prompt: c.text, key: `g.ad.l.${c.id}`, options: shuffle([a, b, ...extra], rand), order: [a.id, b.id] })
  }
  return out
}

/** Eight items of the level; the same item never repeats and kinds are interleaved. */
export function listenRound(level: Level, rand: Rand = Math.random, size = ADULT_ROUND): ListenItem[] {
  const out: ListenItem[] = []
  if (level === 1) {
    const used = new Set<string>()
    let prev: CatId | undefined
    for (let i = 0; i < size; i++) {
      const it = i % 2 === 0 ? catItem(rand, prev) : wordItem(rand, used)
      if (!it) continue
      if (it.kind === 'word') used.add(it.answer)
      if (it.kind === 'cat') prev = CATS.find((c) => it.key === `g.ad.q.${c.id}`)?.id
      out.push(it)
    }
    return out
  }
  if (level === 2) {
    const qa = shuffle(qaItems(rand), rand).slice(0, 4)
    const place = shuffle(placeItems(rand), rand).slice(0, 2)
    const yn = shuffle(yesNoItems(), rand).slice(0, 2)
    return interleave([qa, place, yn], size)
  }
  const cmd = shuffle(commandItems(rand), rand).slice(0, 5)
  const place = shuffle(placeItems(rand), rand).slice(0, 2)
  const qa = shuffle(qaItems(rand), rand).slice(0, 1)
  return interleave([cmd, place, qa], size)
}

/** Takes one from each list in turn so kinds alternate. */
function interleave(lists: ListenItem[][], size: number): ListenItem[] {
  const out: ListenItem[] = []
  const idx = lists.map(() => 0)
  while (out.length < size && lists.some((l, i) => idx[i] < l.length)) {
    for (let i = 0; i < lists.length && out.length < size; i++) {
      if (idx[i] < lists[i].length) out.push(lists[i][idx[i]++])
    }
  }
  return out
}

/**
 * How many different prompts the game can ask in total (all three levels): one per category question, one per picture
 * ("show me the apple"), plus every curated question, place question, yes/no question and two-step command.
 * Used for the hub label, so it counts the same items the rounds draw from.
 */
export function listenTaskCount(): number {
  const steady: Rand = () => 0.5
  const categories = CATS.filter((c) => catItems(c.id).length >= 3).length
  return categories + adultItems().length + qaItems(steady).length + placeItems(steady).length + yesNoItems().length + commandItems(steady).length
}
