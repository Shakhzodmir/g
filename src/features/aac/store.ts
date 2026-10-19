import { create } from 'zustand'
import { stopSpeaking } from '../../audio/speech'
import { getProfile, useProfileStore } from '../../store/profile'
import { EMPTY_MESSAGE, isFull, MESSAGE_LIMIT, messageReducer, type MessageAction, type MessageItem, type MessageState } from './message'

/** What the last dispatch did, for the polite live region ("added" / "removed" / "cleared"). */
export interface MessageChange {
  type: 'add' | 'backspace' | 'clear'
  item?: MessageItem
  /** Bumps on every change so the same text can be announced twice in a row. */
  n: number
}

interface MessageStore extends MessageState {
  /** Profile whose message is shown; the message follows the profile (never leaks to another one). */
  profileId: string
  change: MessageChange | null
  /** Bumps when a word was tapped while the bar was full (the bar shows its calm "ready" state). */
  fullTaps: number
  dispatch: (a: MessageAction) => void
  /** Tapped while full: nothing is added (and nothing is spoken by the caller). */
  noteFullTap: () => void
  bindProfile: (id: string) => void
}

const KEY_PREFIX = 'gapimiz.aac.message.'

function session(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function isItem(x: unknown): x is MessageItem {
  const i = x as MessageItem
  return (
    !!i &&
    typeof i.key === 'string' &&
    typeof i.symbol === 'string' &&
    typeof i.fitz === 'string' &&
    typeof i.text?.uz === 'string' &&
    typeof i.text?.ru === 'string' &&
    typeof i.uid === 'number'
  )
}

/** Reads a profile's saved message (sessionStorage: survives a reload, not a new visit). */
export function loadMessage(profileId: string): MessageState {
  try {
    const raw = session()?.getItem(KEY_PREFIX + profileId)
    if (!raw) return EMPTY_MESSAGE
    const data = JSON.parse(raw) as { items?: unknown; nextUid?: unknown }
    if (!Array.isArray(data.items)) return EMPTY_MESSAGE
    const items = data.items.filter(isItem).slice(0, MESSAGE_LIMIT)
    const top = items.reduce((m, i) => Math.max(m, i.uid), 0)
    return { items, nextUid: Math.max(top + 1, typeof data.nextUid === 'number' ? data.nextUid : 1) }
  } catch {
    return EMPTY_MESSAGE
  }
}

function saveMessage(profileId: string, state: MessageState): void {
  try {
    const s = session()
    if (!s) return
    if (!state.items.length) s.removeItem(KEY_PREFIX + profileId)
    else {
      // Object URLs of custom-card photos die with the page, so they are not saved.
      const items = state.items.map(({ src: _src, ...rest }) => rest)
      s.setItem(KEY_PREFIX + profileId, JSON.stringify({ items, nextUid: state.nextUid }))
    }
  } catch {
    /* storage full or blocked: the message just stays in memory */
  }
}

/** Removes the saved message of a profile (e.g. when the profile is deleted). */
export function forgetMessage(profileId: string): void {
  try {
    session()?.removeItem(KEY_PREFIX + profileId)
  } catch {
    /* ignore */
  }
}

export const useMessage = create<MessageStore>()((set, get) => ({
  ...loadMessage(getProfile().id),
  profileId: getProfile().id,
  change: null,
  fullTaps: 0,

  dispatch: (a) => {
    const { items, nextUid, profileId, change } = get()
    const next = messageReducer({ items, nextUid }, a)
    if (next.items === items && next.nextUid === nextUid) return
    const n = (change?.n ?? 0) + 1
    set({
      ...next,
      change: { type: a.type, item: a.type === 'add' ? next.items[next.items.length - 1] : a.type === 'backspace' ? items[items.length - 1] : undefined, n },
    })
    saveMessage(profileId, next)
  },

  noteFullTap: () => {
    if (isFull(get())) set({ fullTaps: get().fullTaps + 1 })
  },

  bindProfile: (id) => {
    if (id === get().profileId) return
    // Another profile: never carry the sentence over, and never keep speaking it.
    stopSpeaking()
    set({ ...loadMessage(id), profileId: id, change: null, fullTaps: 0 })
  },
}))

// The message follows the active profile (profile switch, deletion, first load of the stored profile).
useProfileStore.subscribe((s, prev) => {
  if (s.profile.id !== prev.profile.id) useMessage.getState().bindProfile(s.profile.id)
})
