import { ChartNoAxesColumn, ClipboardList, Database, HeartHandshake, Info, LayoutGrid, Printer, Settings2, Stethoscope, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import DueBanners from '../check/DueBanners'
import styles from './parent.module.css'
import { avatarSymbol, StorageBanner, useProfileTitle, useT } from './shared'
import type { StrKey } from './strings'

const ITEMS: Array<{ path: string; title: StrKey; hint: StrKey; icon: ReactNode }> = [
  { path: 'progress', title: 'secProgress', hint: 'secProgressHint', icon: <ChartNoAxesColumn /> },
  { path: 'check', title: 'secCheck', hint: 'secCheckHint', icon: <ClipboardList /> },
  { path: 'tips', title: 'secTips', hint: 'secTipsHint', icon: <HeartHandshake /> },
  { path: 'cards', title: 'secCards', hint: 'secCardsHint', icon: <LayoutGrid /> },
  { path: 'profiles', title: 'secProfiles', hint: 'secProfilesHint', icon: <Users /> },
  { path: 'settings', title: 'secSettings', hint: 'secSettingsHint', icon: <Settings2 /> },
  { path: 'data', title: 'secData', hint: 'secDataHint', icon: <Database /> },
  { path: 'help', title: 'secHelp', hint: 'secHelpHint', icon: <Stethoscope /> },
  { path: 'print', title: 'secPrint', hint: 'secPrintHint', icon: <Printer /> },
  { path: 'about', title: 'secAbout', hint: 'secAboutHint', icon: <Info /> },
]

export default function ParentHome() {
  const t = useT()
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)
  const name = useProfileTitle()

  return (
    <>
      <PageHeader title={t('title')} />
      <Page width="normal">
        <div className={styles.spread}>
          <p className={styles.intro}>{t('homeIntro')}</p>
          <span className={styles.profileBadge}>
            <SymbolImg id={avatarSymbol(profile)} className={styles.avatarSm} />
            {t('profileLine', { name })}
          </span>
        </div>
        <StorageBanner />
        <DueBanners />
        <ul className={styles.homeGrid}>
          {ITEMS.map((it) => (
            <li key={it.path}>
              <Pressable className={styles.homeCard} label={t(it.title)} onActivate={() => navigate(`/parent/${it.path}`)}>
                <span className={styles.homeIcon} aria-hidden="true">
                  {it.icon}
                </span>
                <span className={styles.homeText}>
                  <span className={styles.homeTitle}>{t(it.title)}</span>
                  <span className={styles.homeHint}>{t(it.hint)}</span>
                </span>
              </Pressable>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>{tc('disclaimer')}</p>
      </Page>
    </>
  )
}
