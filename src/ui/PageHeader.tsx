import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { COMMON } from '../i18n/common'
import { useStrings } from '../i18n'
import { Button } from './Button'
import styles from './PageHeader.module.css'

/** Screen header with a fixed-position back button (always top-left, never moves). */
export function PageHeader({ title, back = '/', actions, symbol }: { title: string; back?: string | null; actions?: ReactNode; symbol?: ReactNode }) {
  const t = useStrings(COMMON)
  const navigate = useNavigate()
  return (
    <header className={styles.header} data-no-print>
      {back !== null ? (
        <Button className={styles.back} variant="soft" iconOnly icon={<ArrowLeft />} label={t('back')} onActivate={() => navigate(back)}>
          {t('back')}
        </Button>
      ) : (
        <span className={styles.spacer} />
      )}
      <h1 className={styles.title}>
        {symbol && <span className={styles.symbol} aria-hidden="true">{symbol}</span>}
        {title}
      </h1>
      <div className={styles.actions}>{actions}</div>
    </header>
  )
}
