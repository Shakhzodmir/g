import { ArrowLeft, Check, ClipboardList, Minus, Printer, Square, SquareCheck, X } from 'lucide-react'
import { useReducer, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { COMMON } from '../../i18n/common'
import { useI18n, useStrings } from '../../i18n'
import { useFocusHeading } from '../../lib/useFocusHeading'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import parent from '../parent/parent.module.css'
import { ConfirmDialog, Section, StorageBanner } from '../parent/shared'
import { Disclaimer, ResultSection, checkPath } from './Bits'
import { ageChoices, detailComplete, finishRun, initRun, prevInfoOf, progressOf, questionsOf, quickOf, runReducer, type RunState } from './flow'
import { isCheckKind, useChecksReady, useKindRow } from './hooks'
import { CONCERN_ORDER, ageKey, concernKey, kindTitleKey } from './labels'
import { evaluate, type Outcome } from './scoring'
import { useCheckStore } from './store'
import styles from './check.module.css'
import { useCheckT } from './useT'
import type { Answer, CheckKind, CheckResult, CheckStage, ConcernId } from './types'

const ANSWERS: Array<{ value: Answer; text: 'ansYes' | 'ansSometimes' | 'ansNo'; icon: ReactNode }> = [
  { value: 2, text: 'ansYes', icon: <Check /> },
  { value: 1, text: 'ansSometimes', icon: <Minus /> },
  { value: 0, text: 'ansNo', icon: <X /> },
]

/** /parent/check/:kind/run (add ?retest=1 for a repeat check). */
export default function Run() {
  const { kind } = useParams()
  const retest = new URLSearchParams(useLocation().search).has('retest')
  const ready = useChecksReady()
  const row = useKindRow(isCheckKind(kind) ? kind : 'child')
  const t = useCheckT()
  if (!isCheckKind(kind)) return <Navigate to={checkPath()} replace />
  if (!ready) {
    return (
      <>
        <PageHeader title={t(kindTitleKey(kind))} back={checkPath(kind)} />
        <Page width="narrow">
          <p className={parent.muted} role="status">
            {t('loading')}
          </p>
        </Page>
      </>
    )
  }
  const latest = row?.results[row.results.length - 1]
  return <RunInner key={`${kind}:${retest ? 'retest' : 'new'}`} kind={kind} latest={retest ? latest : undefined} />
}

function RunInner({ kind, latest }: { kind: CheckKind; latest: CheckResult | undefined }) {
  const t = useCheckT()
  const { ui } = useI18n()
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const pid = useProfileStore((s) => s.profile.id)
  const save = useCheckStore((s) => s.saveResult)
  const [s, dispatch] = useReducer(runReducer, undefined, () => initRun(kind, prevInfoOf(latest)))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ result: CheckResult; outcome: Outcome } | null>(null)
  const [leaving, setLeaving] = useState(false)
  useFocusHeading(done ? 'done' : s.step)

  const finish = async (state: RunState, stage: CheckStage) => {
    if (saving) return
    setSaving(true)
    const result = finishRun(state, stage, Date.now())
    await save(pid, kind, result)
    setDone({ result, outcome: state.retest ? evaluate(latest, result) : { kind: 'first' } })
  }

  const answer = (id: string, value: Answer) => {
    const list = questionsOf(s)
    const next = runReducer(s, { type: 'answer', id, value })
    dispatch({ type: 'answer', id, value })
    // The last detailed question finishes the check (the caller saves; the reducer only records the answer).
    if (s.step === 'detail' && s.index === list.length - 1 && detailComplete(next)) void finish(next, 'full')
  }

  const leave = () => {
    if (Object.keys(s.answers).length > 0 && !done) setLeaving(true)
    else navigate(checkPath(kind))
  }

  const title = t(kindTitleKey(kind))

  if (done) {
    return (
      <>
        <PageHeader title={title} back={checkPath(kind)} />
        <Page width="normal">
          <ResultSection kind={kind} result={done.result} outcome={done.outcome} title={t('resultTitle')} />
          <div className={styles.actionRow}>
            <Button icon={<ClipboardList />} onActivate={() => navigate(checkPath(kind))}>
              {t('goPlan')}
            </Button>
            <Button variant="soft" icon={<Printer />} onActivate={() => navigate(checkPath(kind, '/report'))}>
              {t('btnReport')}
            </Button>
          </div>
        </Page>
      </>
    )
  }

  const header = <PageHeader title={title} back={null} actions={<Button variant="ghost" onActivate={leave}>{t('cancelRun')}</Button>} />
  const prev = (label: string) => (
    <Button variant="ghost" icon={<ArrowLeft />} onActivate={() => dispatch({ type: 'back' })}>
      {label}
    </Button>
  )
  const leaveDialog = (
    <ConfirmDialog
      open={leaving}
      title={t('leaveTitle')}
      text={t('leaveText')}
      confirm={t('leaveGo')}
      onClose={() => setLeaving(false)}
      onConfirm={() => navigate(checkPath(kind))}
    />
  )

  if (saving) {
    return (
      <>
        {header}
        <Page width="narrow">
          <p className={parent.muted} role="status">
            {t('saving')}
          </p>
        </Page>
      </>
    )
  }

  // ---- adult: a short introduction
  if (s.step === 'intro') {
    return (
      <>
        {header}
        <Page width="narrow">
          <Section title={t('adultIntroTitle')}>
            <p>{t('adultIntroText')}</p>
            <Disclaimer />
            <div className={styles.actionRow}>
              <Button size="lg" onActivate={() => dispatch({ type: 'start' })}>
                {t('adultStart')}
              </Button>
            </div>
          </Section>
        </Page>
        {leaveDialog}
      </>
    )
  }

  // ---- age
  if (s.step === 'age') {
    return (
      <>
        {header}
        <Page width="narrow">
          {kind === 'asd' && (
            <Section title={t('asdIntroTitle')}>
              <p>{t('asdIntroText')}</p>
              <Disclaimer kind="asd" />
            </Section>
          )}
          <Section title={t('ageTitle')}>
            <p className={parent.muted}>{t('ageHint')}</p>
            <ul className={styles.choiceList} role="list">
              {ageChoices(kind).map((age) => (
                <li key={age}>
                  <Pressable className={styles.choiceRow} label={t(ageKey(age))} pressed={s.age === age} scanGroup="age" onActivate={() => dispatch({ type: 'age', age })} data-age={age}>
                    {t(ageKey(age))}
                  </Pressable>
                </li>
              ))}
            </ul>
          </Section>
        </Page>
        {leaveDialog}
      </>
    )
  }

  // ---- what worries you
  if (s.step === 'concerns') {
    return (
      <>
        {header}
        <Page width="narrow">
          <ConcernsStep
            initial={s.concerns}
            onNext={(concerns) => dispatch({ type: 'concerns', concerns })}
            onBack={() => dispatch({ type: 'back' })}
            ageText={s.age ? t('ageLabel', { age: t(ageKey(s.age)) }) : ''}
          />
        </Page>
        {leaveDialog}
      </>
    )
  }

  // ---- result of the quick screen
  if (s.step === 'quickResult') {
    const ok = quickOf(s).onTrack
    const detailBtn = (
      <Button key="d" size="lg" variant={ok ? 'soft' : 'primary'} onActivate={() => dispatch({ type: 'goDetail' })}>
        {t('quickDetail')}
      </Button>
    )
    const finishBtn = (
      <Button key="f" size="lg" variant={ok ? 'primary' : 'soft'} onActivate={() => void finish(s, 'quick')}>
        {t('quickFinish')}
      </Button>
    )
    return (
      <>
        {header}
        <Page width="narrow">
          <Section title={ok ? t('quickOkTitle') : t('quickLookTitle')}>
            <p>{ok ? t('quickOkText') : t('quickLookText')}</p>
            <Disclaimer />
            <div className={styles.actionRow}>{ok ? [finishBtn, detailBtn] : [detailBtn, finishBtn]}</div>
            <div className={styles.actionRow}>{prev(tc('back'))}</div>
          </Section>
        </Page>
        {leaveDialog}
      </>
    )
  }

  // ---- one question at a time (quick or detailed)
  const list = questionsOf(s)
  const q = list[s.index]
  const { n, total } = progressOf(s)
  if (!q) return null
  const current = s.answers[q.id]
  return (
    <>
      {header}
      <Page width="narrow">
        <StorageBanner />
        <div className={styles.runHead}>
          <span>{s.step === 'quick' ? `${t('quickTitle')}` : `${t('detailTitle')}`}</span>
          {s.age && <span>{t('ageLabel', { age: t(ageKey(s.age)) })}</span>}
          <span role="status" data-testid="progress">
            {t('progress', { n, total })}
          </span>
        </div>
        <div className={styles.bar} aria-hidden="true">
          <div className={styles.barFill} style={{ width: `${Math.round((n / Math.max(total, 1)) * 100)}%` }} />
        </div>
        <Section>
          <h2 className={styles.question} data-testid="question">
            {ui(q.text)}
          </h2>
          <p className={parent.hint}>{t('answerHelp')}</p>
          <div className={styles.answers} role="group" aria-label={t('answerHelp')}>
            {ANSWERS.map((a) => (
              <Pressable key={a.value} className={styles.choice} label={t(a.text)} pressed={current === a.value} scanGroup="answers" onActivate={() => answer(q.id, a.value)} data-answer={a.value}>
                <span aria-hidden="true">{a.icon}</span>
                {t(a.text)}
              </Pressable>
            ))}
          </div>
        </Section>
        <div className={styles.actionRow}>{prev(t('prevQuestion'))}</div>
      </Page>
      {leaveDialog}
    </>
  )
}

function ConcernsStep({ initial, onNext, onBack, ageText }: { initial: ConcernId[]; onNext: (c: ConcernId[]) => void; onBack: () => void; ageText: string }) {
  const t = useCheckT()
  const tc = useStrings(COMMON)
  const [picked, setPicked] = useState<ConcernId[]>(initial)
  const toggle = (c: ConcernId) =>
    setPicked((p) => (c === 'unsure' ? (p.includes('unsure') ? [] : ['unsure']) : p.includes(c) ? p.filter((x) => x !== c) : [...p.filter((x) => x !== 'unsure'), c]))
  return (
    <Section title={t('concernsTitle')}>
      {ageText && <p className={parent.hint}>{ageText}</p>}
      <p className={parent.muted}>{t('concernsHint')}</p>
      <ul className={styles.choiceList} role="list">
        {CONCERN_ORDER.map((c) => {
          const on = picked.includes(c)
          return (
            <li key={c}>
              <Pressable className={styles.choiceRow} label={t(concernKey(c))} pressed={on} scanGroup="concerns" onActivate={() => toggle(c)} data-concern={c}>
                <span aria-hidden="true">{on ? <SquareCheck /> : <Square />}</span>
                {t(concernKey(c))}
              </Pressable>
            </li>
          )
        })}
      </ul>
      <div className={styles.actionRow}>
        <Button variant="ghost" icon={<ArrowLeft />} onActivate={onBack}>
          {tc('back')}
        </Button>
        <Button size="lg" disabled={picked.length === 0} onActivate={() => onNext(picked)}>
          {tc('next')}
        </Button>
      </div>
    </Section>
  )
}
