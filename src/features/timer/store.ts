import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useProfileStore } from '../../store/profile'
import { safeLocalStorage } from '../../store/safeStorage'
import { createTimer, type TimerState } from './timerLogic'

/** One timer per profile: a running timer or a chosen duration never leaks to another child. */
export interface TimerSlot {
  timer: TimerState
  /** Chosen duration in minutes. */
  minutes: number
  /** Large digits for adults; null = default (on for adult profiles, off for children). */
  showDigits: boolean | null
  /** Optional "what comes next" card ref. */
  nextRef: string | null
  /**
   * Set (to the wall-clock end time) when the timer ended while nobody could be told: the page was closed or
   * hidden. The next open shows a quiet "time is up" card instead of sound. Cleared by dismissing the card.
   */
  notice: number | null
}

export const DEFAULT_MINUTES = 3

export function defaultSlot(): TimerSlot {
  return { timer: createTimer(DEFAULT_MINUTES * 60_000), minutes: DEFAULT_MINUTES, showDigits: null, nextRef: null, notice: null }
}

/** Shared immutable default, so selectors on a missing slot return a stable reference. */
export const DEFAULT_SLOT: TimerSlot = Object.freeze(defaultSlot()) as TimerSlot

interface TimerStore {
  slots: Record<string, TimerSlot>
  patch: (profileId: string, patch: Partial<TimerSlot>) => void
  remove: (profileId: string) => void
  clear: () => void
}

/** Timer state is wall-clock based, so it survives leaving the screen or reloading. */
export const useTimerStore = create<TimerStore>()(
  persist(
    (set) => ({
      slots: {},
      patch: (profileId, patch) =>
        set((s) => ({ slots: { ...s.slots, [profileId]: { ...(s.slots[profileId] ?? defaultSlot()), ...patch } } })),
      remove: (profileId) =>
        set((s) => {
          if (!(profileId in s.slots)) return s
          const { [profileId]: _gone, ...rest } = s.slots
          return { slots: rest }
        }),
      clear: () => set({ slots: {} }),
    }),
    {
      name: 'gapimiz.timer',
      version: 2,
      storage: createJSONStorage(safeLocalStorage),
      // v1 kept one global timer for the whole device; it belongs to no profile, so it is dropped.
      migrate: () => ({ slots: {} }),
      partialize: (s) => ({ slots: s.slots }),
    },
  ),
)

export function getSlot(profileId: string): TimerSlot {
  return useTimerStore.getState().slots[profileId] ?? DEFAULT_SLOT
}

/** The active profile's timer plus setters (what the Timer screen used to read from the global store). */
export function useTimer() {
  const id = useProfileStore((s) => s.profile.id)
  const slot = useTimerStore((s) => s.slots[id]) ?? DEFAULT_SLOT
  const patch = useTimerStore((s) => s.patch)
  return {
    ...slot,
    setTimer: (timer: TimerState) => patch(id, timer.status === 'done' ? { timer } : { timer, notice: null }),
    setMinutes: (minutes: number) => patch(id, { minutes, timer: createTimer(minutes * 60_000), notice: null }),
    setShowDigits: (showDigits: boolean) => patch(id, { showDigits }),
    setNextRef: (nextRef: string | null) => patch(id, { nextRef }),
    dismissNotice: () => patch(id, { notice: null }),
  }
}

/** Persisted preferences of one profile (used by backup/restore in the adult area). */
export function getTimerPrefs(profileId: string): { minutes: number; showDigits: boolean | null; nextRef: string | null } {
  const { minutes, showDigits, nextRef } = getSlot(profileId)
  return { minutes, showDigits, nextRef }
}

/** Restores preferences; the timer is reset to idle with the new duration (a restored timer never starts by itself). */
export function applyTimerPrefs(profileId: string, p: { minutes: number; showDigits: boolean | null; nextRef: string | null }): void {
  useTimerStore.getState().patch(profileId, {
    minutes: p.minutes,
    showDigits: p.showDigits,
    nextRef: p.nextRef,
    timer: createTimer(p.minutes * 60_000),
    notice: null,
  })
}
