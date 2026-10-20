import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useStrings } from '../i18n'
import { markParentUnlocked } from '../features/parent/unlock'
import { Button } from '../ui/Button'
import { ParentGate } from '../ui/ParentGate'
import { FEATURES } from './features'
import { SHELL } from './strings'

/** The lock to the adult area (hold to open). `onOpened` is for callers that need to know where it leads. */
export function ParentLock({ withText, to = FEATURES.parent.path }: { withText?: boolean; to?: string }) {
  const t = useStrings(SHELL)
  const navigate = useNavigate()
  const [gate, setGate] = useState(false)
  return (
    <>
      <Button variant="ghost" iconOnly={!withText} icon={<Lock />} label={t('parentsLock')} onActivate={() => setGate(true)}>
        {t('parentsLock')}
      </Button>
      <ParentGate
        open={gate}
        onCancel={() => setGate(false)}
        onUnlock={() => {
          setGate(false)
          markParentUnlocked()
          navigate(to)
        }}
      />
    </>
  )
}
