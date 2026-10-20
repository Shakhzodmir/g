import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ONBOARDING } from '../../app/strings'
import { prettyUz, useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import type { UiLang } from '../../i18n/types'
import { Lang } from '../../lib/Lang'
import { useFocusHeading } from '../../lib/useFocusHeading'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import type { AgeGroup } from '../../store/profileTypes'
import { Button } from '../../ui/Button'
import { MessageCircle } from 'lucide-react'
import { Musicha } from '../../ui/mascot/Musicha'
import { Page } from '../../ui/Page'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import {
  AGE_GROUPS,
  allowedPosition,
  defaultAge,
  INFO_PAGES,
  nameValid,
  parseDraft,
  parsePosition,
  positionSearch,
  previousPosition,
  profileAge,
  rewindDepth,
  type Draft,
  type Kind,
  type Position,
} from './flow'
import styles from './Onboarding.module.css'
import { S } from './strings'

const DRAFT_KEY = 'gapimiz.onboarding.draft'
const START_KEY = 'gapimiz.onboarding.start'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* the wizard still works, it just forgets the answers on reload */
  }
}
const historyIdx = (): unknown => (window.history.state as { idx?: unknown } | null)?.idx

/** Language names are shown in their own script, whatever the interface language is (oʻ with the gap-free glyph). */
const LANGS: Array<{ id: UiLang; label: string; sub: string; lang: string }> = [
  { id: 'uz', label: prettyUz('Oʻzbekcha'), sub: 'lotin', lang: 'uz-Latn' },
  { id: 'uzc', label: 'Ўзбекча', sub: 'кирилл', lang: 'uz-Cyrl' },
  { id: 'ru', label: 'Русский', sub: '', lang: 'ru' },
]

function Choice({
  label,
  hint,
  symbol,
  selected,
  lang,
  onActivate,
}: {
  label: string
  hint?: string
  symbol?: string
  selected?: boolean
  lang?: string
  onActivate: () => void
}) {
  return (
    <Pressable className={styles.choice} label={label} pressed={selected} onActivate={onActivate} lang={lang}>
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

const ageLabel = (a: AgeGroup) => a.replace('-', '–')

export default function Onboarding() {
  const t = useStrings(ONBOARDING)
  const tx = useStrings(S)
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const location = useLocation()
  const uiLang = useDevice((s) => s.uiLang)
  const setUiLang = useDevice((s) => s.setUiLang)
  const onboarded = useDevice((s) => s.onboarded)
  const setOnboarded = useDevice((s) => s.setOnboarded)
  const createProfile = useProfileStore((s) => s.create)

  // The step is in the URL (Back goes one step back, a reload resumes); the answers are kept for the tab.
  const want = useMemo(() => parsePosition(location.search), [location.search])
  const [draft, setDraft] = useState<Draft>(() => parseDraft(readSession(DRAFT_KEY)))
  useEffect(() => writeSession(DRAFT_KEY, JSON.stringify(draft)), [draft])
  const pos = allowedPosition(want, draft)
  const { step, info } = pos
  const { kind, name, ageGroup } = draft

  const go = (p: Position, replace = false) => navigate(`/onboarding${positionSearch(p)}`, { replace })

  useEffect(() => {
    // A reload or a hand-typed address asked for a step whose answers are missing: put the wizard where it can continue.
    if (pos.step !== want.step || pos.info !== want.info) go(pos, true)
  }, [pos.step, pos.info, want.step, want.info]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Where the wizard began, so finishing can rewind to it and leave no onboarding entries behind Home.
    if (readSession(START_KEY) === null && typeof historyIdx() === 'number') writeSession(START_KEY, String(historyIdx()))
  }, [])

  const [nameError, setNameError] = useState(false)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  useFocusHeading(`${step}:${info}`)

  // Finished (or opened when already set up): leave the wizard. History is rewound to its first entry, then replaced by Home.
  const rewinding = useRef<string | null>(null)
  useEffect(() => {
    if (!onboarded) return
    if (rewinding.current !== null && rewinding.current === location.key) return
    if (rewinding.current === null) {
      const depth = rewindDepth(historyIdx(), Number(readSession(START_KEY)))
      writeSession(DRAFT_KEY, null)
      writeSession(START_KEY, null)
      if (depth > 0) {
        rewinding.current = location.key
        navigate(-depth)
        return
      }
    }
    navigate('/', { replace: true })
  }, [onboarded, location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const chooseKind = (k: Kind) => {
    patch({ kind: k, ageGroup: defaultAge(k) })
    go({ step: 'name', info: 0 })
  }

  const submitName = () => {
    if (!nameValid(name)) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    go({ step: 'info', info: 0 })
  }

  const finish = async () => {
    if (busy) return
    setBusy(true)
    // One language choice: the app speaks the language it is shown in (Uzbek in either script, or Russian).
    // The speech language can still be changed separately in the adult area.
    await createProfile({
      kind,
      speechLang: uiLang === 'ru' ? 'ru' : 'uz',
      name: name.trim(),
      ageGroup: profileAge(draft),
      theme: kind === 'adult' ? 'kattalar' : 'bolajon',
    })
    void navigator.storage?.persist?.().catch(() => false)
    setOnboarded(true)
  }

  const back = previousPosition(pos)
  const goBack = () => {
    // Prefer real history Back so the stack stays one step per screen; fall back to a push when there is none.
    if (back && Number(historyIdx()) > Number(readSession(START_KEY) ?? 0)) navigate(-1)
    else if (back) go(back, true)
  }

  const infos = [
    kind === 'adult'
      ? { title: tx('infoAdult1Title'), text: tx('infoAdult1Text'), symbol: 'speech_balloon' }
      : { title: t('info1Title'), text: t('info1Text'), symbol: 'family' },
    { title: t('info2Title'), text: t('info2Text'), symbol: 'locked' },
    { title: t('info3Title'), text: t('info3Text'), symbol: 'key' },
  ]

  return (
    <main className={styles.page}>
      <Page width="narrow" className={styles.body}>
        {/* The mascot belongs to the child's mode only; before the choice (and for adults) a calm brand mark. */}
        {kind === 'child' && (step === 'name' || step === 'info') ? (
          <div className={styles.mascot}>
            <Musicha state={step === 'info' ? 'happy' : 'idle'} size={120} title="" />
          </div>
        ) : (
          <div className={styles.brandMark} data-testid="brand-mark" role="img" aria-label={tc('appName')}>
            <span className={styles.brandIcon} aria-hidden="true">
              <MessageCircle />
            </span>
            <span className={styles.brandName} aria-hidden="true">
              {tc('appName')}
            </span>
          </div>
        )}

        {step === 'lang' && (
          <section className={styles.step} aria-labelledby="ob-lang">
            <h1 id="ob-lang" className={styles.h}>
              <Lang lang="uz-Latn">Tilni tanlang</Lang> / <Lang lang="ru">Выберите язык</Lang>
            </h1>
            <div className={styles.choices}>
              {LANGS.map((l) => (
                <Choice
                  key={l.id}
                  label={l.label}
                  hint={l.sub}
                  lang={l.lang}
                  selected={uiLang === l.id}
                  onActivate={() => {
                    setUiLang(l.id)
                    go({ step: 'who', info: 0 })
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
              <Choice label={t('child')} hint={t('childHint')} symbol="child" onActivate={() => chooseKind('child')} />
              <Choice label={t('adult')} hint={t('adultHint')} symbol="adult" onActivate={() => chooseKind('adult')} />
            </div>
            <Button variant="ghost" onActivate={goBack}>
              {tc('back')}
            </Button>
          </section>
        )}

        {step === 'name' && (
          <form
            className={styles.step}
            aria-labelledby="ob-name"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              submitName()
            }}
          >
            <h1 id="ob-name" className={styles.h}>
              {t('nameTitle')}
            </h1>
            <label className={styles.field}>
              <span>{t('nameQ')}</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  patch({ name: e.target.value })
                  if (nameError && nameValid(e.target.value)) setNameError(false)
                }}
                placeholder={t('namePh')}
                maxLength={30}
                autoComplete="off"
                aria-required="true"
                aria-invalid={nameError || undefined}
                aria-describedby={nameError ? 'ob-name-err ob-name-hint' : 'ob-name-hint'}
              />
              <span id="ob-name-hint" className={styles.fieldHint}>
                {t('nameHint')}
              </span>
              {/* Always in the page, so the reason is announced the moment it appears. */}
              <span id="ob-name-err" className={styles.fieldError} role="status" aria-live="polite">
                {nameError ? tx('nameRequired') : ''}
              </span>
            </label>

            {kind === 'child' && (
              <div className={styles.age} role="group" aria-labelledby="ob-age">
                <p id="ob-age" className={styles.ageTitle}>
                  {tx('ageTitle')}
                </p>
                <div className={styles.chips}>
                  {AGE_GROUPS.map((a) => (
                    <Pressable key={a} className={styles.chip} label={ageLabel(a)} pressed={ageGroup === a} onActivate={() => patch({ ageGroup: a })}>
                      {ageLabel(a)}
                    </Pressable>
                  ))}
                </div>
                <p className={styles.fieldHint}>{tx('ageHint')}</p>
              </div>
            )}

            <div className={styles.row}>
              <Button variant="ghost" onActivate={goBack}>
                {tc('back')}
              </Button>
              <Button size="lg" onActivate={submitName}>
                {tc('next')}
              </Button>
            </div>
          </form>
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
            <div className={styles.dots} role="img" aria-label={tx('infoStep', { n: info + 1, total: INFO_PAGES })}>
              {infos.map((_, i) => (
                <span key={i} data-on={i === info || undefined} />
              ))}
            </div>
            <div className={styles.row}>
              <Button variant="ghost" onActivate={goBack}>
                {tc('back')}
              </Button>
              {info < infos.length - 1 ? (
                <Button size="lg" onActivate={() => go({ step: 'info', info: info + 1 })}>
                  {tc('next')}
                </Button>
              ) : (
                <Button size="lg" disabled={busy} onActivate={() => void finish()}>
                  {t('finish')}
                </Button>
              )}
            </div>
            {info < infos.length - 1 && (
              <Button variant="ghost" className={styles.skip} disabled={busy} onActivate={() => void finish()}>
                {tc('skip')}
              </Button>
            )}
          </section>
        )}
      </Page>
    </main>
  )
}
