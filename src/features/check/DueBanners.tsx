import { useNavigate } from 'react-router'
import { RetestBanner, checkPath } from './Bits'
import { useChecksReady, useKindView } from './hooks'
import { kindTitleKey } from './labels'
import styles from './check.module.css'
import { useCheckT } from './useT'
import type { CheckKind } from './types'

function One({ kind }: { kind: CheckKind }) {
  const t = useCheckT()
  const navigate = useNavigate()
  const { due } = useKindView(kind)
  if (!due) return null
  return (
    <div className={styles.tight}>
      <p className={styles.dueKind}>{t(kindTitleKey(kind))}</p>
      <RetestBanner offset={due.offset} onGo={() => navigate(checkPath(kind, '/run?retest=1'))} />
    </div>
  )
}

/** In-app reminder shown on the adult home: one banner for every repeat check that is due. Renders nothing otherwise. */
export default function DueBanners() {
  const ready = useChecksReady()
  if (!ready) return null
  return (
    <>
      {(['child', 'asd', 'adult'] as const).map((k) => (
        <One key={k} kind={k} />
      ))}
    </>
  )
}
