import { Images, RotateCcw, ThumbsUp } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { useDevice } from '../../store/device'
import { Button } from '../../ui/Button'
import { Musicha } from '../../ui/mascot/Musicha'
import { Reward } from '../../ui/misc'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { LevelControl } from './LevelPicker'
import type { GameSession } from './session'
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
  children: ReactNode
}

/** Shared frame of every game: header, level, progress beads, stage, then a calm reward. */
export function GameShell({ session, title, symbol, toolbar, showLevel = true, showProgress = true, children }: GameShellProps) {
  const board = useDevice((s) => s.boardMode)

  return (
    <div className={styles.page} data-board={board || undefined}>
      <PageHeader title={title} back="/games" symbol={<SymbolImg id={symbol} />} />

      {(toolbar || showLevel || showProgress) && session.phase === 'play' && (
        <div className={styles.toolbar}>
          {toolbar && <div className={styles.toolbarStart}>{toolbar}</div>}
          <div className={styles.meta}>
            {showProgress && <Progress done={session.done} total={session.total} />}
            {showLevel && <LevelControl session={session} />}
          </div>
        </div>
      )}

      {session.phase === 'play' ? (
        <div className={styles.stage}>{children}</div>
      ) : (
        <RewardPanel session={session} />
      )}
    </div>
  )
}

/**
 * Adult button for speak-type tasks ("Uddaladi! / Получилось!"): the adult, not the app, decides that
 * the child said it. `before`/`after` hold the task's own buttons (listen, next) in the same row.
 */
export function AdultBar({ onConfirm, before, after }: { onConfirm: () => void; before?: ReactNode; after?: ReactNode }) {
  const t = useStrings(S)
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
