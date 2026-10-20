import { Download, ExternalLink } from 'lucide-react'
import { APP_NAME, REPO_URL } from '../../app/brand'
import { prefetchLanguagePack, usePackStatus } from '../../audio/offlinePack'
import { isIosBrowser, promptInstall, useInstall } from '../../lib/installPrompt'
import { prefetchSymbolsPack, summarizeOffline, useSymbolsPackStatus } from '../../lib/symbolsPack'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import styles from './parent.module.css'
import { APP_VERSION, Section, useT } from './shared'
import type { StrKey } from './strings'

const LICENSES: Array<{ what: StrKey; name: string; license: string }> = [
  { what: 'lic_symbols', name: 'Fluent Emoji', license: 'MIT © Microsoft Corporation' },
  { what: 'lic_voice', name: 'Microsoft Azure Neural TTS (uz-UZ-MadinaNeural, ru-RU-SvetlanaNeural)', license: 'Microsoft' },
  { what: 'lic_fonts', name: 'Nunito, Onest', license: 'SIL Open Font License 1.1' },
  { what: 'lic_icons', name: 'Lucide', license: 'ISC' },
  { what: 'lic_face', name: 'MediaPipe Tasks Vision', license: 'Apache License 2.0' },
  { what: 'lic_code', name: 'React, React Router, Vite, Zustand, Dexie, Motion, Workbox', license: 'MIT' },
]

/** "Offline ready": the speech clips of the speech language plus the picture symbols are on the device. */
function OfflineSection() {
  const t = useT()
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const audio = usePackStatus()
  const symbols = useSymbolsPackStatus()
  const sum = summarizeOffline(audio, symbols)
  const line =
    sum.state === 'done'
      ? t('offlineReady')
      : sum.state === 'running'
        ? t('offlinePreparing', { done: sum.done, total: sum.total })
        : sum.state === 'skipped'
          ? t('offlineSkipped')
          : sum.state === 'partial'
            ? t('offlinePartial')
            : t('offlineHint')
  return (
    <Section title={t('offlineTitle')}>
      <p role="status" className={sum.state === 'done' ? undefined : styles.hint}>
        {line}
      </p>
      {(sum.state === 'skipped' || sum.state === 'partial') && (
        <div className={styles.row}>
          <Button
            variant="soft"
            icon={<Download />}
            onActivate={() => void prefetchLanguagePack(speechLang, { force: true }).finally(() => prefetchSymbolsPack({ force: true }).catch(() => undefined))}
          >
            {t('offlineNow')}
          </Button>
        </div>
      )}
    </Section>
  )
}

/** Install button (Chromium `beforeinstallprompt`) or the iPhone / iPad "Add to Home Screen" hint. Hidden once installed. */
function InstallSection() {
  const t = useT()
  const { canPrompt, installed } = useInstall()
  return (
    <Section title={t('installTitle')}>
      {installed ? (
        <p>{t('installed')}</p>
      ) : (
        <>
          <p className={styles.hint}>{t('installHint')}</p>
          {canPrompt ? (
            <div className={styles.row}>
              <Button variant="soft" icon={<Download />} onActivate={() => void promptInstall()}>
                {t('installBtn')}
              </Button>
            </div>
          ) : (
            <p>{isIosBrowser() ? t('installIos') : t('installOther')}</p>
          )}
        </>
      )}
    </Section>
  )
}

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

        <OfflineSection />
        <InstallSection />

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
            <Button variant="soft" icon={<ExternalLink />} label={REPO_URL.replace(/^https:\/\//, '')} onActivate={() => window.open(REPO_URL, '_blank', 'noopener,noreferrer')}>
              <span className={styles.url}>{REPO_URL.replace(/^https:\/\//, '')}</span>
            </Button>
          </div>
        </Section>
      </Page>
    </>
  )
}
