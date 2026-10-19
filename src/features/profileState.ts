import { clearAllLevels, clearProfileLevels } from './games/logic/levelKey'
import { useStickerMemory } from './games/stickers'
import { clearScheduleMemory, useScheduleUi } from './schedule/useSchedule'
import { useTimerStore } from './timer/store'
import { useTokenStore } from './tokens/store'

/*
 * Everything the child features keep on this device outside IndexedDB, keyed by profile id:
 *   gapimiz.timer            timer, chosen minutes, "what next" card  (slot per profile)
 *   gapimiz.tokens           star board and reward                    (board per profile)
 *   gapimiz.games.level.*    difficulty of each game                  (key per profile + game)
 *   in memory                stickers and schedules held while IndexedDB is unavailable
 *   gapimiz.schedule.ui      last schedule view (device-wide)         (only cleared with everything)
 *
 * The adult area calls these when a profile is deleted / all data is erased, so nothing of one child can
 * show up for the next one.
 */

/** Forget the local state of one deleted profile. */
export function clearProfileLocalState(profileId: string): void {
  useTimerStore.getState().remove(profileId)
  useTokenStore.getState().remove(profileId)
  clearProfileLevels(profileId)
  useStickerMemory.getState().clear(profileId)
  clearScheduleMemory(profileId)
}

/** Forget the local state of every profile (erase all data). `profileIds` are the known profiles; stale keys are swept too. */
export function clearAllLocalState(profileIds: string[] = []): void {
  useTimerStore.getState().clear()
  useTokenStore.getState().clear()
  clearAllLevels(profileIds)
  useStickerMemory.getState().clear()
  clearScheduleMemory()
  useScheduleUi.setState({ mode: 'day' })
  useScheduleUi.persist.clearStorage()
  useTimerStore.persist.clearStorage()
  useTokenStore.persist.clearStorage()
}
