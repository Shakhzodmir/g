import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = globalThis.matchMedia?.(query)
      mql?.addEventListener?.('change', cb)
      return () => mql?.removeEventListener?.('change', cb)
    },
    () => globalThis.matchMedia?.(query).matches ?? false,
    () => false,
  )
}
