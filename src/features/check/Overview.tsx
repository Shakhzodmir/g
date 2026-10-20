import { ArrowRight, Bell, Check, CircleCheck, CircleDashed, ClipboardList, Flame, HeartHandshake, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useI18n } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import parent from '../parent/parent.module.css'
import { ConfirmDialog, Section, StorageBanner } from '../parent/shared'
import { BandBadge, Disclaimer, ResultSection, RetestBanner, checkPath } from './Bits'
import { CHECK_CONFIG } from './config'
import { dayNumber, formatDay } from './days'
import { useChecksReady, useKindView, isCheckKind } from './hooks'
import { domainKey, kindTitleKey } from './labels'
import { appTaskSymbol, appTaskTitle, canOpen, routeOf, totalMinutes, type PlanTask } from './plan'
import { attentionDomains } from './scoring'
import { useCheckStore } from './store'
import { APP_HINTS } from './tips'
import styles from './check.module.css'
import { useCheckT } from './useT'
import type { CheckKind, CheckResult } from './types'

function TaskCard({ kind, task, done, onTick }: { kind: CheckKind; task: PlanTask; done: boolean; onTick: () => void }) {
  const t = useCheckT()
  const { ui } = useI18n()
  const navigate = useNavigate()
  const profileKind = useProfileStore((s) => s.profile.kind)
  const audience = kind === 'adult' ? 'adult' : 'child'
  const title = task.tip ? ui(task.tip.title) : ui(appTaskTitle(task.target!, audience))
  const body = task.tip ? ui(task.tip.body) : ui(APP_HINTS[kind][task.domain] ?? { uz: '', ru: '' })
  const tickText = done ? t('todayDone') : t('tickDo')
  return (
    <li className={styles.task} data-done={done || undefined} data-testid="plan-task" data-task-id={task.id}>
      <div className={styles.taskHead}>
        <span className={styles.taskIcon} aria-hidden="true">
          {task.tip ? <HeartHandshake /> : <SymbolImg id={appTaskSymbol(task.target!)} />}
        </span>
        <div className={styles.tight}>
          <h3 className={styles.taskTitle}>{title}</h3>
          <div className={styles.kindMeta}>
            <span className={styles.tag}>{task.tip ? t('tagTip') : t('tagApp')}</span>
            <span className={styles.tag}>{t('minShort', { n: task.minutes })}</span>
            <span className={styles.tag}>{t(domainKey(task.domain))}</span>
          </div>
        </div>
      </div>
      {body && <p className={styles.taskBody}>{body}</p>}
      <div className={styles.taskActions}>
        <Button
          variant={done ? 'primary' : 'secondary'}
          icon={done ? <CircleCheck /> : <Check />}
          pressed={done}
          label={`${tickText}: ${title}`}
          onActivate={onTick}
        >
          {tickText}
        </Button>
        {task.target && canOpen(task.target, profileKind) && (
          <Button variant="soft" icon={<ArrowRight />} label={`${t('taskOpen')}: ${title}`} onActivate={() => navigate(routeOf(task.target!))}>
            {t('taskOpen')}
          </Button>
        )}
      </div>
    </li>
  )
}

function HistoryRow({ r }: { r: CheckResult }) {
  const t = useCheckT()
  const att = attentionDomains(r).length
  return (
    <li className={styles.historyRow} data-testid="history-row">
      <div className={styles.historyTop}>
        <span>{t('historyRow', { date: formatDay(dayNumber(r.ts)), stage: r.stage === 'quick' ? t('stageQuick') : t('stageFull') })}</span>
        <BandBadge band={r.overall} />
      </div>
      <span className={parent.hint}>
        {r.retest ? `${t('historyRetest')} · ` : ''}
        {att ? t('historyAttention', { n: att }) : t('historyNoAttention')}
      </span>
    </li>
  )
}

/** /parent/check/:kind: latest result, today's plan with "done" ticks, streak, 7/14/30 day schedule, history. */
export default function Overview() {
  const { kind } = useParams()
  if (!isCheckKind(kind)) return <Navigate to={checkPath()} replace />
  return <OverviewFor kind={kind} />
}

function OverviewFor({ kind }: { kind: CheckKind }) {
  const t = useCheckT()
  const navigate = useNavigate()
  const ready = useChecksReady()
  const view = useKindView(kind)
  const profile = useProfileStore((s) => s.profile)
  const tick = useCheckStore((s) => s.tick)
  const removeKind = useCheckStore((s) => s.removeKind)
  const [deleting, setDeleting] = useState(false)
  const row = useCheckStore((s) => s.rows[`${profile.id}:${kind}`])
  const run = (retest: boolean) => navigate(checkPath(kind, retest ? '/run?retest=1' : '/run'))

  const header = <PageHeader title={t(kindTitleKey(kind))} back={checkPath()} />
  if (!ready) {
    return (
      <>
        {header}
        <Page width="normal">
          <p className={parent.muted} role="status">
            {t('loading')}
          </p>
        </Page>
      </>
    )
  }
  const { latest } = view
  if (!latest) {
    return (
      <>
        {header}
        <Page width="normal">
          <StorageBanner />
          <EmptyState
            symbol="clipboard"
            title={t('noResultTitle')}
            text={t('noResultText')}
            action={
              <Button size="lg" icon={<ClipboardList />} onActivate={() => run(false)}>
                {t('btnStart')}
              </Button>
            }
          />
          <Disclaimer kind={kind} />
        </Page>
      </>
    )
  }
  const minutes = totalMinutes(view.tasks)
  const focusNames = (row?.plan?.focus ?? []).map((d) => t(domainKey(d))).join(', ')
  return (
    <>
      {header}
      <Page width="normal">
        <StorageBanner />
        {view.due && <RetestBanner offset={view.due.offset} onGo={() => run(true)} />}

        <ResultSection kind={kind} result={latest} outcome={view.outcome} title={t('latestTitle')} />

        <Section title={t('planTitle', { min: t('minShort', { n: CHECK_CONFIG.plan.minutes }) })} id="plan">
          {view.tasks.length ? (
            <>
              <p className={parent.muted}>{t('planHint')}</p>
              {focusNames && <p className={parent.hint}>{t('planFocus', { names: focusNames })}</p>}
              <ul className={styles.tasks} role="list">
                {view.tasks.map((task) => (
                  <TaskCard key={task.id} kind={kind} task={task} done={view.doneToday.has(task.id)} onTick={() => void tick(profile.id, kind, view.todayKey, task.id)} />
                ))}
              </ul>
              <p className={parent.hint}>{minutes ? t('planTotal', { min: t('minShort', { n: minutes }) }) : ''}</p>
            </>
          ) : (
            <p className={parent.muted}>{t('noPlan')}</p>
          )}
        </Section>

        <div className={parent.twoCol}>
          <Section title={t('streakTitle')}>
            <div className={parent.stats} data-testid="streak">
              <div className={parent.stat}>
                <span className={parent.statNum}>
                  <Flame aria-hidden="true" className={styles.flame} /> {view.streak.current}
                </span>
                <span className={parent.statLabel}>{t('streakNow', { n: view.streak.current })}</span>
              </div>
            </div>
            <p className={parent.muted}>{view.streak.days ? t('streakBest', { n: view.streak.best }) : t('streakNone')}</p>
            {view.streak.days > 0 && <p className={parent.muted}>{t('streakTotal', { n: view.streak.days })}</p>}
            <p className={view.streak.todayDone ? parent.status : parent.hint}>{view.streak.todayDone ? t('todayDone') : t('todayOpen')}</p>
          </Section>

          <Section title={t('retestTitle')}>
            <p className={parent.muted}>{t('retestHint')}</p>
            <ul className={styles.milestones} role="list" data-testid="milestones">
              {view.milestones.map((m) => (
                <li key={m.offset} className={styles.milestone} data-state={m.state}>
                  <span className={styles.milestoneText}>{t('retestRow', { n: m.offset, date: formatDay(m.dueDay) })}</span>
                  <span className={m.state === 'due' ? styles.tagDue : styles.tag}>
                    {m.state === 'done' ? <CircleCheck aria-hidden="true" /> : m.state === 'due' ? <Bell aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}
                    {m.state === 'done' ? t('msDone') : m.state === 'due' ? t('msDue') : t('msUpcoming')}
                  </span>
                </li>
              ))}
            </ul>
            {view.cycleDone && <p className={parent.status}>{t('cycleDone')}</p>}
          </Section>
        </div>

        <Section title={t('historyTitle')}>
          <ul className={styles.history} role="list" data-testid="history">
            {[...(row?.results ?? [])].reverse().map((r) => (
              <HistoryRow key={r.id} r={r} />
            ))}
          </ul>
        </Section>

        <div className={styles.actionRow}>
          {view.cycleDone ? (
            <Button icon={<ClipboardList />} onActivate={() => run(false)}>
              {t('btnNew')}
            </Button>
          ) : (
            <>
              <Button icon={<RotateCcw />} onActivate={() => run(true)}>
                {t('btnRetest')}
              </Button>
              <Button variant="soft" icon={<ClipboardList />} onActivate={() => run(false)}>
                {t('btnNew')}
              </Button>
            </>
          )}
          <Button variant="soft" icon={<Printer />} onActivate={() => navigate(checkPath(kind, '/report'))}>
            {t('btnReport')}
          </Button>
          <Button variant="ghost" icon={<Trash2 />} onActivate={() => setDeleting(true)}>
            {t('btnDelete')}
          </Button>
        </div>
        <ConfirmDialog
          open={deleting}
          title={t('deleteTitle')}
          text={t('deleteText')}
          confirm={t('deleteDo')}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            setDeleting(false)
            void removeKind(profile.id, kind)
          }}
        />
      </Page>
    </>
  )
}
