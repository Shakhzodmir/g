import { Images, RotateCcw, ThumbsUp, Timer } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { safeLocalStorage } from '../../store/safeStorage'
import { Button } from '../../ui/Button'
import { Musicha } from '../../ui/mascot/Musicha'
import { Reward } from '../../ui/misc'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { LevelControl } from './LevelPicker'
import type { GameSession } from './session'
import ad from './adult/Adult.module.css'
import styles from './Games.module.css'
import { S } from './strings'

export interface GameShellProps {
  session: GameSession
  title: string
  symbol: string
  /** Game-specific controls shown left of the level switch (mode, topic, players…). */
  toolbar?: ReactNode
  showLevel?: boolean
  showProgress?: boolean
  /** Adult profiles: extra lines under the result count (e.g. the cue levels of a naming round). */
  resultNote?: (session: GameSession) => ReactNode
  /** Adult profiles: replaces the default «{total} dan {correct} ta» line (e.g. «8 dan 5 ta maslahatsiz»). */
  resultMain?: (session: GameSession) => string | null
  children: ReactNode
}

/**
 * Shared frame of every game: header, level, progress, stage, then a calm result.
 * Child profiles get beads, stickers and praise; adult profiles get plain numbers, an optional stopwatch and no rewards.
 */
export function GameShell({ session, title, symbol, toolbar, showLevel = true, showProgress = true, resultNote, resultMain, children }: GameShellProps) {
  const board = useDevice((s) => s.boardMode)
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const [timer, setTimer] = useTimerPref()

  return (
    <div className={styles.page} data-board={board || undefined} data-adult={adult || undefined}>
      <PageHeader title={title} back="/games" symbol={<SymbolImg id={symbol} />} />

      {(toolbar || showLevel || showProgress || adult) && session.phase === 'play' && (
        <div className={styles.toolbar}>
          {toolbar && <div className={styles.toolbarStart}>{toolbar}</div>}
          <div className={styles.meta}>
            {showProgress && (adult ? <ProgressText done={session.done} total={session.total} /> : <Progress done={session.done} total={session.total} />)}
            {adult && <TimerToggle on={timer} onChange={setTimer} since={session.startedAt} />}
            {showLevel && <LevelControl session={session} />}
          </div>
        </div>
      )}

      {session.phase === 'play' ? (
        <div className={styles.stage}>{children}</div>
      ) : adult ? (
        <AdultResult session={session} note={resultNote?.(session)} main={resultMain?.(session) ?? null} />
      ) : (
        <RewardPanel session={session} />
      )}
    </div>
  )
}

const timerStore = safeLocalStorage()
const TIMER_KEY = 'gapimiz.games.timer'

/** The adult stopwatch is off by default (no pressure); the choice is remembered on this device. */
function useTimerPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => timerStore.getItem(TIMER_KEY) === '1')
  return [
    on,
    (v) => {
      setOn(v)
      timerStore.setItem(TIMER_KEY, v ? '1' : '0')
    },
  ]
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Counts up (never down) from `since`; shown only when the person switched it on. */
function TimerToggle({ on, onChange, since }: { on: boolean; onChange: (v: boolean) => void; since: number }) {
  const t = useStrings(S)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [on])
  return (
    <span className={ad.timer}>
      {on && (
        <span className={ad.timerValue} role="timer" aria-label={t('timerLabel')}>
          {formatClock((now - since) / 1000)}
        </span>
      )}
      <Button variant="ghost" iconOnly icon={<Timer />} pressed={on} label={on ? t('timerHide') : t('timerShow')} onActivate={() => onChange(!on)}>
        {on ? t('timerHide') : t('timerShow')}
      </Button>
    </span>
  )
}

function ProgressText({ done, total }: { done: number; total: number }) {
  const t = useStrings(S)
  return (
    <p className={ad.progressText} aria-label={t('progress', { n: done, total })}>
      {t('progressNum', { n: Math.min(done + 1, total), total })}
    </p>
  )
}

/** Plain result for adults: the counts, how long it took, what the game wants to add, and two ways on. No sticker, no praise. */
function AdultResult({ session, note, main }: { session: GameSession; note?: ReactNode; main: string | null }) {
  const t = useStrings(S)
  const navigate = useNavigate()
  const sum = session.summary
  return (
    <div className={ad.result} role="status">
      <h2 className={ad.resultTitle}>{t('resultTitle')}</h2>
      {sum && (
        <>
          <p className={ad.resultCount}>{main ?? t('resultCount', { correct: sum.correct, total: sum.total })}</p>
          {note}
          <p className={ad.resultMeta}>{t('resultTime', { time: formatClock(sum.durationSec) })}</p>
        </>
      )}
      {session.suggestRest && <p className={ad.resultMeta}>{t('resultRest')}</p>}
      <div className={styles.rewardActions}>
        <Button variant="primary" size="lg" icon={<RotateCcw />} onActivate={session.nextRound}>
          {t('anotherSet')}
        </Button>
        <Button variant="soft" size="lg" onActivate={() => navigate('/games')}>
          {t('toTraining')}
        </Button>
        {session.suggestRest && (
          <Button variant="ghost" size="lg" onActivate={() => navigate('/calm')}>
            {t('toRelax')}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Adult button for speak-type tasks ("Uddaladi! / Получилось!"): the adult, not the app, decides that
 * the child said it. `before`/`after` hold the task's own buttons (listen, next) in the same row.
 */
export function AdultBar({ onConfirm, before, after }: { onConfirm: () => void; before?: ReactNode; after?: ReactNode }) {
  const t = useStrings(S)
  const selfConfirm = useProfileStore((s) => s.profile.kind === 'adult')
  if (selfConfirm) {
    // An adult profile marks its own attempt: plain wording, no "for adults" hint, no warm reward button.
    return (
      <div className={styles.adultBar}>
        {before}
        <Button variant="primary" size="lg" icon={<ThumbsUp />} onActivate={onConfirm}>
          {t('saidIt')}
        </Button>
        {after}
      </div>
    )
  }
  return (
    <div className={styles.adultBar}>
      {(before || after) && (
        <span className={styles.adultTools}>
          {before}
          {after}
        </span>
      )}
      <span className={styles.adultWrap}>
        <span className={styles.adultHint}>{t('forAdults')}</span>
        <Button variant="warm" size="xl" icon={<ThumbsUp />} onActivate={onConfirm}>
          {t('gotIt')}
        </Button>
      </span>
    </div>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const t = useStrings(S)
  return (
    <div className={styles.progress} role="img" aria-label={t('progress', { n: done, total })}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={styles.dot} data-on={i < done || undefined} />
      ))}
    </div>
  )
}

function RewardPanel({ session }: { session: GameSession }) {
  const t = useStrings(S)
  const label = useLabel()
  const navigate = useNavigate()
  const preset = useMotionPreset()
  const s = session.sticker
  return (
    <motion.div className={styles.reward} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={preset.screen}>
      {session.suggestRest ? (
        // Compact sticker when the rest card is shown, so everything fits on one phone screen.
        <div className={styles.rewardSmall} role="status">
          {s && <SymbolImg id={s.symbol} size={72} />}
          <span>
            <span className={styles.rewardSmallName}>{s ? label(s) : ''}</span>
            <span className={styles.rewardText}>{t('newSticker')}</span>
          </span>
        </div>
      ) : (
        <>
          {s ? <Reward symbol={s.symbol} label={label(s)} /> : <div className={styles.rewardWait} aria-hidden="true" />}
          <p className={styles.rewardText}>{t('newSticker')}</p>
        </>
      )}

      {session.suggestRest && (
        <div className={styles.restCard} role="status">
          <Musicha state="calm" size={88} calm title="" />
          <div className={styles.restBody}>
            <p className={styles.restTitle}>{t('rest')}</p>
            <p className={styles.restText}>{t('restText')}</p>
          </div>
        </div>
      )}

      <div className={styles.rewardActions}>
        {session.suggestRest ? (
          <>
            <Button variant="primary" size="lg" icon={<SymbolImg id="calm" size={32} />} onActivate={() => navigate('/calm')}>
              {t('toCalm')}
            </Button>
            <Button variant="soft" size="lg" onActivate={() => navigate('/games')}>
              {t('toGames')}
            </Button>
            <Button variant="ghost" size="lg" icon={<RotateCcw />} onActivate={session.nextRound}>
              {t('again')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="xl" icon={<RotateCcw />} onActivate={session.nextRound}>
              {t('again')}
            </Button>
            <Button variant="soft" size="lg" icon={<Images />} onActivate={() => navigate('/games/stickers')}>
              {t('album')}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  )
}
