import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ONBOARDING } from '../../app/strings'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import type { SpeechLang, UiLang } from '../../i18n/types'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Musicha } from '../../ui/mascot/Musicha'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Onboarding.module.css'

type Step = 'lang' | 'who' | 'speech' | 'info'

const LANGS: Array<{ id: UiLang; label: string; sub: string }> = [
  { id: 'uz', label: 'Oʻzbekcha', sub: 'lotin' },
  { id: 'uzc', label: 'Ўзбекча', sub: 'кирилл' },
  { id: 'ru', label: 'Русский', sub: '' },
]

function Choice({ label, hint, symbol, selected, onActivate }: { label: string; hint?: string; symbol?: string; selected?: boolean; onActivate: () => void }) {
  return (
    <Pressable className={styles.choice} label={label} pressed={selected} onActivate={onActivate}>
      {symbol && (
        <span className={styles.choiceIcon} aria-hidden="true">
          <SymbolImg id={symbol} />
        </span>
      )}
      <span className={styles.choiceText}>
        <span className={styles.choiceLabel}>{label}</span>
        {hint && <span className={styles.choiceHint}>{hint}</span>}
      </span>
    </Pressable>
  )
}

export default function Onboarding() {
  const t = useStrings(ONBOARDING)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const uiLang = useDevice((s) => s.uiLang)
  const setUiLang = useDevice((s) => s.setUiLang)
  const setOnboarded = useDevice((s) => s.setOnboarded)
  const createProfile = useProfileStore((s) => s.create)
  const [step, setStep] = useState<Step>('lang')
  const [kind, setKind] = useState<'child' | 'adult'>('child')
  const [speech, setSpeech] = useState<SpeechLang>(uiLang === 'ru' ? 'ru' : 'uz')
  const [name, setName] = useState('')
  const [info, setInfo] = useState(0)

  const finish = async () => {
    await createProfile({ kind, speechLang: speech, name: name.trim(), theme: kind === 'adult' ? 'kattalar' : 'bolajon' })
    setOnboarded(true)
    void navigator.storage?.persist?.().catch(() => false)
    navigate('/', { replace: true })
  }

  const infos = [
    { title: t('info1Title'), text: t('info1Text'), symbol: 'family' },
    { title: t('info2Title'), text: t('info2Text'), symbol: 'locked' },
    { title: t('info3Title'), text: t('info3Text'), symbol: 'key' },
  ]

  return (
    <main className={styles.page}>
      <div className={styles.mascot}>
        <Musicha state={step === 'info' ? 'happy' : 'idle'} size={120} title="" />
      </div>

      {step === 'lang' && (
        <section className={styles.step} aria-labelledby="ob-lang">
          <h1 id="ob-lang" className={styles.h}>
            Tilni tanlang / Выберите язык
          </h1>
          <div className={styles.choices}>
            {LANGS.map((l) => (
              <Choice
                key={l.id}
                label={l.label}
                hint={l.sub}
                selected={uiLang === l.id}
                onActivate={() => {
                  setUiLang(l.id)
                  setSpeech(l.id === 'ru' ? 'ru' : 'uz')
                  setStep('who')
                }}
              />
            ))}
          </div>
        </section>
      )}

      {step === 'who' && (
        <section className={styles.step} aria-labelledby="ob-who">
          <h1 id="ob-who" className={styles.h}>
            {t('whoUses')}
          </h1>
          <div className={styles.choices}>
            <Choice label={t('child')} hint={t('childHint')} symbol="child" onActivate={() => (setKind('child'), setStep('speech'))} />
            <Choice label={t('adult')} hint={t('adultHint')} symbol="adult" onActivate={() => (setKind('adult'), setStep('speech'))} />
          </div>
          <Button variant="ghost" onActivate={() => setStep('lang')}>
            {tc('back')}
          </Button>
        </section>
      )}

      {step === 'speech' && (
        <section className={styles.step} aria-labelledby="ob-speech">
          <h1 id="ob-speech" className={styles.h}>
            {t('speechLang')}
          </h1>
          <div className={styles.choices}>
            <Choice label={t('speechUz')} selected={speech === 'uz'} onActivate={() => setSpeech('uz')} />
            <Choice label={t('speechRu')} selected={speech === 'ru'} onActivate={() => setSpeech('ru')} />
          </div>
          <label className={styles.field}>
            <span>{t('nameQ')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePh')} maxLength={30} autoComplete="off" />
          </label>
          <div className={styles.row}>
            <Button variant="ghost" onActivate={() => setStep('who')}>
              {tc('back')}
            </Button>
            <Button size="lg" onActivate={() => setStep('info')}>
              {tc('next')}
            </Button>
          </div>
        </section>
      )}

      {step === 'info' && (
        <section className={styles.step} aria-labelledby="ob-info">
          <div className={styles.infoIcon} aria-hidden="true">
            <SymbolImg id={infos[info].symbol} />
          </div>
          <h1 id="ob-info" className={styles.h}>
            {infos[info].title}
          </h1>
          <p className={styles.p}>{infos[info].text}</p>
          <div className={styles.dots} aria-hidden="true">
            {infos.map((_, i) => (
              <span key={i} data-on={i === info || undefined} />
            ))}
          </div>
          <div className={styles.row}>
            <Button variant="ghost" onActivate={() => void finish()}>
              {tc('skip')}
            </Button>
            {info < infos.length - 1 ? (
              <Button size="lg" onActivate={() => setInfo(info + 1)}>
                {tc('next')}
              </Button>
            ) : (
              <Button size="lg" onActivate={() => void finish()}>
                {t('finish')}
              </Button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
