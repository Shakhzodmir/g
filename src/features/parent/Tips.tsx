import { TIPS } from '../../content/tips'
import { useI18n } from '../../i18n'
import { Card } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './parent.module.css'
import { useT } from './shared'

export default function Tips() {
  const t = useT()
  const { ui } = useI18n()
  return (
    <>
      <PageHeader title={t('secTips')} back="/parent" />
      <Page width="normal">
        <p className={styles.intro}>{t('tipsIntro')}</p>
        <ol className={styles.tips}>
          {TIPS.map((tip) => (
            <li key={tip.id}>
              <Card as="article" className={styles.tip}>
                <SymbolImg id={tip.symbol} className={styles.tipSym} />
                <div className={styles.tight}>
                  <h2 className={styles.h3}>{ui(tip.title)}</h2>
                  <p className={styles.tipBody}>{ui(tip.body)}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Page>
    </>
  )
}
