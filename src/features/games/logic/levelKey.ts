import { safeLocalStorage } from '../../../store/safeStorage'
import { isLevel, type GameId, type Level } from './rounds'

/*
 * The chosen difficulty belongs to a child, not to the device: it is stored per profile id, so one child's
 * level 3 never leaks into another child's game. One shared storage object (safe localStorage with a memory
 * fallback), so the game and the "forget this profile" cleanup see the same data.
 */

export const GAME_IDS: GameId[] = ['animals', 'find', 'memory', 'syllables', 'naming', 'sentence', 'category', 'wordpic', 'oddone', 'listen', 'situations', 'colors', 'count', 'shapes', 'odd', 'routine', 'sound', 'build', 'opposite', 'point']

export const levelStorage = safeLocalStorage()

export const LEVEL_KEY_PREFIX = 'gapimiz.games.level.'

export function levelKey(profileId: string, game: GameId): string {
  return `${LEVEL_KEY_PREFIX}${profileId}.${game}`
}

/** Pre-profile key (before levels were stored per child). Never read again, only cleaned up. */
function legacyKey(game: GameId): string {
  return `${LEVEL_KEY_PREFIX}${game}`
}

export function loadLevel(profileId: string, game: GameId): Level {
  const v = Number(levelStorage.getItem(levelKey(profileId, game)))
  return isLevel(v) ? v : 1
}

export function saveLevel(profileId: string, game: GameId, level: Level): void {
  levelStorage.setItem(levelKey(profileId, game), String(level))
}

export function clearProfileLevels(profileId: string): void {
  for (const g of GAME_IDS) levelStorage.removeItem(levelKey(profileId, g))
}

export function clearAllLevels(profileIds: string[]): void {
  for (const g of GAME_IDS) levelStorage.removeItem(legacyKey(g))
  for (const id of profileIds) clearProfileLevels(id)
  // Keys of profiles that are no longer known (deleted elsewhere): sweep real localStorage by prefix.
  try {
    const ls = globalThis.localStorage
    const stale: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k?.startsWith(LEVEL_KEY_PREFIX)) stale.push(k)
    }
    stale.forEach((k) => levelStorage.removeItem(k))
  } catch {
    /* storage unavailable: the memory copy was cleared above */
  }
}
