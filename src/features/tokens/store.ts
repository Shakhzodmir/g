import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../store/safeStorage'
import { createBoard, type TokenBoard } from './tokenLogic'

interface TokenStore {
  /** Current board per profile id. */
  boards: Record<string, TokenBoard>
  setBoard: (profileId: string, board: TokenBoard) => void
  remove: (profileId: string) => void
  clear: () => void
}

export const DEFAULT_BOARD: TokenBoard = createBoard(5, 'st.ayiqcha')

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      boards: {},
      setBoard: (profileId, board) => set((s) => ({ boards: { ...s.boards, [profileId]: board } })),
      remove: (profileId) =>
        set((s) => {
          if (!(profileId in s.boards)) return s
          const { [profileId]: _gone, ...rest } = s.boards
          return { boards: rest }
        }),
      clear: () => set({ boards: {} }),
    }),
    { name: 'gapimiz.tokens', version: 1, storage: createJSONStorage(safeLocalStorage) },
  ),
)
