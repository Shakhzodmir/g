import { useEffect, useMemo, useState } from 'react'
import { useProfileStore } from '../../store/profile'
import { deriveKind, type KindView } from './derive'
import { useCheckStore } from './store'
import { CHECK_KINDS, rowId, type CheckKind, type CheckRow } from './types'

/** The current time, refreshed every minute and when the tab becomes visible again (so "today" flips at midnight). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}

/** Loads the checks of the active profile from IndexedDB once per profile; `ready` is true when the rows can be trusted. */
export function useChecksReady(): boolean {
  const pid = useProfileStore((s) => s.profile.id)
  const hydrate = useCheckStore((s) => s.hydrate)
  const [readyFor, setReadyFor] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void hydrate(pid).finally(() => {
      if (alive) setReadyFor(pid)
    })
    return () => {
      alive = false
    }
  }, [pid, hydrate])
  return readyFor === pid
}

export function useKindRow(kind: CheckKind): CheckRow | undefined {
  const pid = useProfileStore((s) => s.profile.id)
  return useCheckStore((s) => s.rows[rowId(pid, kind)])
}

export function useKindView(kind: CheckKind): KindView {
  const row = useKindRow(kind)
  const now = useNow()
  return useMemo(() => deriveKind(kind, row, now), [kind, row, now])
}

export function isCheckKind(v: string | undefined): v is CheckKind {
  return !!v && (CHECK_KINDS as readonly string[]).includes(v)
}
