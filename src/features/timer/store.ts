import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../store/safeStorage'
import { createTimer, type TimerState } from './timerLogic'

interface TimerStore {
  timer: TimerState
  /** Chosen duration in minutes. */
  minutes: number
  /** Large digits for adults; null = default (on for adult profiles, off for children). */
  showDigits: boolean | null
  /** Optional "what comes next" card ref. */
  nextRef: string | null
  setTimer: (t: TimerState) => void
  setMinutes: (m: number) => void
  setShowDigits: (v: boolean) => void
  setNextRef: (r: string | null) => void
}

/** Timer state is wall-clock based, so it survives leaving the screen or reloading. */
export const useTimerStore = create<TimerStore>()(
  persist(
    (set) => ({
      timer: createTimer(3 * 60_000),
      minutes: 3,
      showDigits: null,
      nextRef: null,
      setTimer: (timer) => set({ timer }),
      setMinutes: (minutes) => set({ minutes, timer: createTimer(minutes * 60_000) }),
      setShowDigits: (showDigits) => set({ showDigits }),
      setNextRef: (nextRef) => set({ nextRef }),
    }),
    { name: 'gapimiz.timer', version: 1, storage: createJSONStorage(safeLocalStorage) },
  ),
)
