import type { StateStorage } from 'zustand/middleware'

/** localStorage that silently falls back to memory (private mode, blocked storage, previews). */
export function safeLocalStorage(): StateStorage {
  const memory = new Map<string, string>()
  const ls = (): Storage | null => {
    try {
      const s = globalThis.localStorage
      const probe = '__gapimiz_probe__'
      s.setItem(probe, '1')
      s.removeItem(probe)
      return s
    } catch {
      return null
    }
  }
  return {
    getItem: (name) => {
      try {
        return ls()?.getItem(name) ?? memory.get(name) ?? null
      } catch {
        return memory.get(name) ?? null
      }
    },
    setItem: (name, value) => {
      memory.set(name, value)
      try {
        ls()?.setItem(name, value)
      } catch {
        /* keep in memory only */
      }
    },
    removeItem: (name) => {
      memory.delete(name)
      try {
        ls()?.removeItem(name)
      } catch {
        /* ignore */
      }
    },
  }
}
