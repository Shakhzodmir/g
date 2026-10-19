import type { Fitz } from '../../content/types'
import type { Bi } from '../../i18n/types'

/** Maximum number of symbols in the message bar (keeps the sentence short and the bar readable). */
export const MESSAGE_LIMIT = 20

/** One symbol in the message bar. */
export interface MessageItem {
  /** Audio key: `w.<wordId>`, `p.<phraseId>` or `c.<customCardId>`. */
  key: string
  text: Bi
  symbol: string
  fitz: Fitz
  /** Object URL of a custom card photo. */
  src?: string
  /** Unique per item in the bar (the same word may appear twice). */
  uid: number
}

export interface MessageState {
  items: MessageItem[]
  nextUid: number
}

export type MessageAction =
  | { type: 'add'; item: Omit<MessageItem, 'uid'> }
  | { type: 'backspace' }
  | { type: 'clear' }

export const EMPTY_MESSAGE: MessageState = { items: [], nextUid: 1 }

/** Pure reducer for the message bar: add (up to MESSAGE_LIMIT), remove the last item, clear. */
export function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case 'add':
      if (state.items.length >= MESSAGE_LIMIT) return state
      return { items: [...state.items, { ...action.item, uid: state.nextUid }], nextUid: state.nextUid + 1 }
    case 'backspace':
      if (state.items.length === 0) return state
      return { ...state, items: state.items.slice(0, -1) }
    case 'clear':
      if (state.items.length === 0) return state
      return { ...state, items: [] }
    default:
      return state
  }
}

export function isFull(state: MessageState): boolean {
  return state.items.length >= MESSAGE_LIMIT
}
