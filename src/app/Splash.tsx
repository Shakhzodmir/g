import { useStrings } from '../i18n'
import styles from './Splash.module.css'
import { SHELL_EXTRA } from './strings'

/** Shown while the profile loads: never a blank page. Static under reduced motion / calm. */
export function Splash() {
  const t = useStrings(SHELL_EXTRA)
  return (
    <div className={styles.splash} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.name}>Gapimiz</span>
      <span className="visually-hidden">{t('splash')}</span>
    </div>
  )
}
