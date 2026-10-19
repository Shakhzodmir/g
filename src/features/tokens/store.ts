import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../store/safeStorage'
import { createBoard, type TokenBoard } from './tokenLogic'

interface TokenStore {
  /** Current board per profile id. */
  boards: Record<string, TokenBoard>
  setBoard: (profileId: string, board: TokenBoard) => void
}

export const DEFAULT_BOARD: TokenBoard = createBoard(5, 'st.ayiqcha')

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      boards: {},
      setBoard: (profileId, board) => set((s) => ({ boards: { ...s.boards, [profileId]: board } })),
    }),
    { name: 'gapimiz.tokens', version: 1, storage: createJSONStorage(safeLocalStorage) },
  ),
)
