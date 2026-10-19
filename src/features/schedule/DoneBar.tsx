import { useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import styles from './Schedule.module.css'
import { S } from './strings'

/**
 * The one primary action of a schedule ("Tayyor / Готово"), anchored above the navigation. It never moves, however the
 * list above it reflows after each tap, and the list scrolls beneath it. A tremor-proof repeat guard keeps a double tap
 * from ticking two activities.
 */
export function DoneBar({ name, onDone, scanGroup }: { name: string; onDone: () => void; scanGroup: string }) {
  const t = useStrings(S)
  const repeatMs = useProfileStore((s) => s.profile.touch.ignoreRepeatMs)
  return (
    <div className={styles.doneBar} data-no-print>
      <Button
        size="xl"
        className={styles.doneBtn}
        label={t('doneFor', { name })}
        scanGroup={scanGroup}
        touch={{ ignoreRepeatMs: Math.max(800, repeatMs) }}
        onActivate={onDone}
      >
        {t('done')}
      </Button>
    </div>
  )
}
