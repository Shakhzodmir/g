import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../store/safeStorage'

export type BlowScene = 'candles' | 'dandelion' | 'boat'

/** Adult-tuned sensor settings, remembered on this device. */
interface ExerciseSettings {
  blowSensitivity: number
  voiceSensitivity: number
  mirrorThreshold: number
  blowScene: BlowScene
  /** ms timestamp when the last FULL breathing session ended (the 2-minute limit), for the rest period. */
  lastBlowEnd: number | null
  set: (patch: Partial<Omit<ExerciseSettings, 'set'>>) => void
}

export const DEFAULT_THRESHOLD = 0.25

export const useExerciseSettings = create<ExerciseSettings>()(
  persist(
    (set) => ({
      blowSensitivity: 5,
      voiceSensitivity: 5,
      mirrorThreshold: DEFAULT_THRESHOLD,
      blowScene: 'candles',
      lastBlowEnd: null,
      set: (patch) => set(patch),
    }),
    {
      name: 'gapimiz.exercises',
      version: 1,
      storage: createJSONStorage(safeLocalStorage),
      partialize: ({ set: _s, ...rest }) => rest,
    },
  ),
)
