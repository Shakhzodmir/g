import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Bi } from '../../i18n/types'

export type GameAudience = 'child' | 'adult' | 'both'
export type GameGroup = 'listen' | 'look' | 'think' | 'speak'

export interface GameDef {
  /** Route segment under /games and audio key part (`g.<id>.*`). Lowercase ascii. */
  id: string
  /** Hub tile symbol id (public/symbols). */
  symbol: string
  tone: 'primary' | 'secondary' | 'warm' | 'calm' | 'neutral'
  audience: GameAudience
  /**
   * Suggested age in whole years, [from, to], shown on the hub of child profiles ("3–6 yosh"). Adult-only games carry
   * [16, 99] and show no age. These are editorial suggestions: check them with the speech therapist.
   */
  ages: [from: number, to: number]
  /** Hub section: listen (ear), look (eye), think (logic), speak (voice). */
  group: GameGroup
  title: Bi
  /** Adult profiles see this title instead (a plain name instead of a playful one). */
  titleAdult?: Bi
  Component: LazyExoticComponent<ComponentType>
}

/**
 * Every game of the app. To add one: create the screen (default export, built on GameShell) and append ONE entry here.
 * The hub, the routes and the audience filter (child / adult profile) are all generated from this list.
 */
export const GAMES: GameDef[] = [
  { id: 'animals', symbol: 'cow', tone: 'warm', ages: [2, 5], audience: 'child', group: 'listen', title: { uz: 'Kim nima deydi?', ru: 'Кто как говорит?' }, Component: lazy(() => import('./AnimalsGame')) },
  { id: 'find', symbol: 'magnifying_glass_tilted_left', tone: 'primary', ages: [3, 7], audience: 'both', group: 'look', title: { uz: 'Topchi!', ru: 'Найди!' }, titleAdult: { uz: 'Rasmni topish', ru: 'Найти картинку' }, Component: lazy(() => import('./FindGame')) },
  { id: 'memory', symbol: 'puzzle_piece', tone: 'secondary', ages: [3, 8], audience: 'both', group: 'look', title: { uz: 'Juftini top', ru: 'Найди пару' }, titleAdult: { uz: 'Juftlarni topish', ru: 'Найти пары' }, Component: lazy(() => import('./MemoryGame')) },
  { id: 'syllables', symbol: 'drum', tone: 'calm', ages: [4, 8], audience: 'both', group: 'speak', title: { uz: 'Chapak-chapak', ru: 'Хлоп-хлоп' }, titleAdult: { uz: 'Boʻgʻinlar', ru: 'Слоги' }, Component: lazy(() => import('./SyllablesGame')) },
  // Adult training games (aphasia, dysarthria, word finding): src/features/games/adult/
  { id: 'naming', symbol: 'microphone', tone: 'primary', ages: [16, 99], audience: 'adult', group: 'speak', title: { uz: 'Nomlash', ru: 'Называние' }, Component: lazy(() => import('./adult/NamingGame')) },
  { id: 'sentence', symbol: 'memo', tone: 'secondary', ages: [16, 99], audience: 'adult', group: 'speak', title: { uz: 'Gap tuzish', ru: 'Составление фраз' }, Component: lazy(() => import('./adult/SentenceGame')) },
  { id: 'category', symbol: 'card_index_dividers', tone: 'calm', ages: [16, 99], audience: 'adult', group: 'think', title: { uz: 'Turkumlar', ru: 'Категории' }, Component: lazy(() => import('./adult/CategoryGame')) },
  { id: 'wordpic', symbol: 'framed_picture', tone: 'primary', ages: [16, 99], audience: 'adult', group: 'look', title: { uz: 'Rasm va soʻz', ru: 'Картинка и слово' }, Component: lazy(() => import('./adult/WordPicGame')) },
  { id: 'oddone', symbol: 'white_question_mark', tone: 'warm', ages: [16, 99], audience: 'adult', group: 'think', title: { uz: 'Nima ortiqcha?', ru: 'Что лишнее?' }, Component: lazy(() => import('./adult/OddOneGame')) },
  { id: 'listen', symbol: 'ear', tone: 'secondary', ages: [16, 99], audience: 'adult', group: 'listen', title: { uz: 'Tinglab tushunish', ru: 'Понимание на слух' }, Component: lazy(() => import('./adult/ListenGame')) },
  { id: 'situations', symbol: 'speech_balloon', tone: 'neutral', ages: [16, 99], audience: 'adult', group: 'speak', title: { uz: 'Kunlik vaziyatlar', ru: 'Ситуации' }, Component: lazy(() => import('./adult/SituationsGame')) },
  // Children's games (round 3): src/features/games/*Game.tsx, data in src/content/gamedata.ts
  { id: 'colors', symbol: 'artist_palette', tone: 'warm', ages: [2, 5], audience: 'child', group: 'look', title: { uz: 'Rangni top', ru: 'Найди цвет' }, Component: lazy(() => import('./ColorsGame')) },
  { id: 'shapes', symbol: 'kg_blue_diamond', tone: 'primary', ages: [2, 5], audience: 'child', group: 'look', title: { uz: 'Shaklni top', ru: 'Найди фигуру' }, Component: lazy(() => import('./ShapesGame')) },
  { id: 'count', symbol: 'abacus', tone: 'secondary', ages: [3, 6], audience: 'child', group: 'think', title: { uz: 'Sanaymiz', ru: 'Считаем' }, Component: lazy(() => import('./CountGame')) },
  { id: 'odd', symbol: 'detective', tone: 'calm', ages: [4, 8], audience: 'child', group: 'think', title: { uz: 'Nima ortiqcha?', ru: 'Что лишнее?' }, Component: lazy(() => import('./OddOneOutGame')) },
  { id: 'routine', symbol: 'sunrise', tone: 'warm', ages: [4, 8], audience: 'child', group: 'think', title: { uz: 'Nima keyin?', ru: 'Что дальше?' }, Component: lazy(() => import('./RoutineGame')) },
  { id: 'opposite', symbol: 'left_right_arrow', tone: 'primary', ages: [4, 8], audience: 'child', group: 'think', title: { uz: 'Qarama-qarshi', ru: 'Наоборот' }, Component: lazy(() => import('./OppositesGame')) },
  { id: 'sound', symbol: 'ear', tone: 'secondary', ages: [5, 8], audience: 'child', group: 'listen', title: { uz: 'Qaysi tovush?', ru: 'Какой звук?' }, Component: lazy(() => import('./FirstSoundGame')) },
  { id: 'point', symbol: 'headphone', tone: 'calm', ages: [3, 7], audience: 'child', group: 'listen', title: { uz: 'Eshit va koʻrsat', ru: 'Послушай и покажи' }, Component: lazy(() => import('./ListenPointGame')) },
  { id: 'build', symbol: 'blocks', tone: 'warm', ages: [5, 9], audience: 'child', group: 'speak', title: { uz: 'Soʻz yigʻ', ru: 'Собери слово' }, Component: lazy(() => import('./BuildWordGame')) },
]

export const GROUP_TITLES: Record<GameGroup, Bi> = {
  listen: { uz: 'Tinglaymiz', ru: 'Слушаем' },
  look: { uz: 'Qaraymiz', ru: 'Смотрим' },
  think: { uz: 'Oʻylaymiz', ru: 'Думаем' },
  speak: { uz: 'Gapiramiz', ru: 'Говорим' },
}

/** Hub section titles for adult profiles: plain nouns instead of "we listen / we look". */
export const GROUP_TITLES_ADULT: Record<GameGroup, Bi> = {
  listen: { uz: 'Eshitib tushunish', ru: 'Понимание речи' },
  look: { uz: 'Koʻrish va tanish', ru: 'Зрительное восприятие' },
  think: { uz: 'Fikrlash', ru: 'Мышление' },
  speak: { uz: 'Nutq', ru: 'Речь' },
}

/** Title and symbol of a game for the progress screen (game ids are the `ref` of `game_round` events). */
export function gameMeta(id: string): { title: Bi; titleAdult?: Bi; symbol: string } | undefined {
  const g = GAMES.find((x) => x.id === id)
  return g ? { title: g.title, titleAdult: g.titleAdult, symbol: g.symbol } : undefined
}

export const GROUP_ORDER: GameGroup[] = ['listen', 'look', 'think', 'speak']

export function gamesFor(kind: 'child' | 'adult'): GameDef[] {
  return GAMES.filter((g) => g.audience === 'both' || g.audience === kind)
}
