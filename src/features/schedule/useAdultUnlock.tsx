import { useCallback, useState } from 'react'
import { useProfileStore } from '../../store/profile'
import { ParentGate } from '../../ui/ParentGate'

/**
 * Adult-only actions (editing a schedule, setting up a board) go through the hold-3s ParentGate on a
 * child profile. On an adult profile the person is their own adult, so no gate.
 */
export function useAdultUnlock() {
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const [pending, setPending] = useState<(() => void) | null>(null)

  const requestUnlock = useCallback(
    (then: () => void) => {
      if (adult) then()
      else setPending(() => then)
    },
    [adult],
  )

  const gate = (
    <ParentGate
      open={pending !== null}
      onCancel={() => setPending(null)}
      onUnlock={() => {
        const fn = pending
        setPending(null)
        fn?.()
      }}
    />
  )

  return { requestUnlock, gate }
}
