import { ExternalLink } from 'lucide-react'
import { APP_NAME, REPO_URL } from '../../app/brand'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import styles from './parent.module.css'
import { APP_VERSION, Section, useT } from './shared'
import type { StrKey } from './strings'

const LICENSES: Array<{ what: StrKey; name: string; license: string }> = [
  { what: 'lic_symbols', name: 'Fluent Emoji', license: 'MIT © Microsoft Corporation' },
  { what: 'lic_voice', name: 'Silero TTS models', license: 'MIT' },
  { what: 'lic_fonts', name: 'Nunito, Onest', license: 'SIL Open Font License 1.1' },
  { what: 'lic_icons', name: 'Lucide', license: 'ISC' },
  { what: 'lic_face', name: 'MediaPipe Tasks Vision', license: 'Apache License 2.0' },
  { what: 'lic_code', name: 'React, React Router, Vite, Zustand, Dexie, Motion, Workbox', license: 'MIT' },
]

export default function About() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('secAbout')} back="/parent" />
      <Page width="narrow">
        <Section>
          <div className={styles.tight}>
            <h2 className={styles.h2}>{APP_NAME}</h2>
            <p className={styles.muted}>{t('version', { v: APP_VERSION })}</p>
          </div>
          <p>{t('aboutText', { app: APP_NAME })}</p>
        </Section>

        <Section title={t('privacyTitle')}>
          <p>{t('privacyText')}</p>
          <p>{t('privacyMedia')}</p>
        </Section>

        <Section title={t('disclaimerTitle')}>
          <p>{t('disclaimerText', { app: APP_NAME })}</p>
          <p className={styles.hint}>{t('reviewNote')}</p>
        </Section>

        <Section title={t('licensesTitle')}>
          <ul className={styles.licenses}>
            {LICENSES.map((l) => (
              <li key={l.what}>
                <span className={styles.hint}>{t(l.what)}</span>
                <span className={styles.licName}>{l.name}</span>
                <span>{l.license}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('repo')}>
          <p className={styles.hint}>{t('repoHint')}</p>
          <div className={styles.row}>
            <Button variant="soft" icon={<ExternalLink />} onActivate={() => window.open(REPO_URL, '_blank', 'noopener,noreferrer')}>
              {REPO_URL.replace(/^https:\/\//, '')}
            </Button>
          </div>
        </Section>
      </Page>
    </>
  )
}
