import { create } from 'zustand'
import { EMPTY_MESSAGE, messageReducer, type MessageAction, type MessageState } from './message'

interface MessageStore extends MessageState {
  dispatch: (a: MessageAction) => void
}

/** The message bar survives leaving the screen (e.g. a break in the calm corner), in memory only. */
export const useMessage = create<MessageStore>()((set, get) => ({
  ...EMPTY_MESSAGE,
  dispatch: (a) => {
    const { items, nextUid } = get()
    const next = messageReducer({ items, nextUid }, a)
    if (next.items !== items || next.nextUid !== nextUid) set(next)
  },
}))
