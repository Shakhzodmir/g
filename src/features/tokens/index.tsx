import { RotateCcw, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { playSfx } from '../../audio/sfx'
import { speak, speakSequence, type SpeakItem } from '../../audio/speech'
import { NUMBER_LINES } from '../../content/voiceLines'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Reward } from '../../ui/misc'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { resolveCard, useCustomCards, voice } from '../schedule/cards'
import { CardArt, CardPicker, type PickerGroup } from '../schedule/CardPicker'
import { useAdultUnlock } from '../schedule/useAdultUnlock'
import { DEFAULT_BOARD, useTokenStore } from './store'
import { S } from './strings'
import { addToken, isComplete, MAX_GOAL, MIN_GOAL, remaining, remainingSpeechIds, resetBoard, setGoal, setReward } from './tokenLogic'
import styles from './Tokens.module.css'

const REWARD_GROUPS: PickerGroup[] = ['stickers', 'activities', 'mine', 'topics']
const GOALS = Array.from({ length: MAX_GOAL - MIN_GOAL + 1 }, (_, i) => MIN_GOAL + i)

function speechFor(id: string): SpeakItem {
  if (id.startsWith('n.')) {
    const line = NUMBER_LINES.find((l) => l.id === `num_${id.slice(2)}`)
    return { key: id, text: line ? { uz: line.uz, ru: line.ru } : { uz: id.slice(2), ru: id.slice(2) } }
  }
  return voice(id.slice(2))
}

function Star({ filled, index }: { filled: boolean; index: number }) {
  const preset = useMotionPreset()
  return (
    <span className={styles.star} data-filled={filled || undefined} style={{ '--i': index } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path className={styles.starOutline} d="M50 6 L62 37 L95 38 L69 59 L78 92 L50 73 L22 92 L31 59 L5 38 L38 37 Z" />
        {filled && (
          <motion.path
            className={styles.starFill}
            d="M50 6 L62 37 L95 38 L69 59 L78 92 L50 73 L22 92 L31 59 L5 38 L38 37 Z"
            initial={{ opacity: 0, scale: preset.movement ? 0.4 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={preset.pop}
            style={{ transformOrigin: '50px 55px' }}
          />
        )}
      </svg>
    </span>
  )
}

export default function Tokens() {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const label = useLabel()
  const profileId = useProfileStore((s) => s.profile.id)
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const repeatMs = useProfileStore((s) => s.profile.touch.ignoreRepeatMs)
  const board = useTokenStore((s) => s.boards[profileId]) ?? DEFAULT_BOARD
  const setBoardFor = useTokenStore((s) => s.setBoard)
  const setBoard = (b: typeof board) => setBoardFor(profileId, b)
  const custom = useCustomCards()
  const reward = board.rewardRef ? resolveCard(board.rewardRef, custom) : null
  const complete = isComplete(board)
  const left = remaining(board)
  const { requestUnlock, gate } = useAdultUnlock()
  const [setupOpen, setSetupOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const add = () => {
    const next = addToken(board)
    if (next === board) return
    setBoard(next)
    const nLeft = remaining(next)
    const items = remainingSpeechIds(nLeft, speechLang).map(speechFor)
    if (nLeft === 0) {
      playSfx('chime')
      if (reward) items.push(reward.speech)
      setTimeout(() => void speakSequence(items), 500)
    } else {
      playSfx('pop')
      setTimeout(() => void speakSequence(items), 200)
    }
  }

  const progress = t('progress', { count: board.count, goal: board.goal })
  // Wide screens: one row up to 5 stars; phones: two rows from 4 stars so each star stays big.
  const cols = board.goal <= 5 ? board.goal : Math.ceil(board.goal / 2)
  const colsNarrow = board.goal <= 3 ? board.goal : Math.ceil(board.goal / 2)

  return (
    <>
      <PageHeader title={t('title')} symbol={<SymbolImg id="star" />} />
      <Page width="normal">
        <div className={styles.layout}>
          <section className={styles.display}>
            <div className={styles.rewardBox}>
              <span className={styles.rewardHead}>{t('reward')}</span>
              {reward ? (
                <Pressable className={styles.rewardCard} label={`${t('reward')}: ${label(reward.label)}`} onActivate={() => void speak(reward.speech)}>
                  <span className={styles.rewardArt} aria-hidden="true">
                    <CardArt card={reward} />
                  </span>
                  <span className={styles.rewardName}>{label(reward.label)}</span>
                </Pressable>
              ) : (
                <span className={styles.rewardNone}>{t('noReward')}</span>
              )}
            </div>

            <Pressable
              className={styles.stars}
              style={{ '--cols-wide': cols, '--cols-narrow': colsNarrow } as React.CSSProperties}
              label={progress}
              onActivate={() => void speakSequence(remainingSpeechIds(left, speechLang).map(speechFor))}
            >
              {Array.from({ length: board.goal }, (_, i) => (
                <Star key={i} index={i} filled={i < board.count} />
              ))}
            </Pressable>

            {complete && (
              <div className={styles.celebrate}>
                <Reward symbol={reward?.symbol ?? 'glowing_star'} label={reward ? label(reward.label) : t('allCollected')} />
              </div>
            )}
          </section>

          <section className={styles.controls}>
            {complete ? (
              <Button size="xl" block variant="primary" icon={<RotateCcw />} onActivate={() => setBoard(resetBoard(board))}>
                {t('again')}
              </Button>
            ) : (
              <Button size="xl" block variant="warm" label={t('addLabel')} onActivate={add} touch={{ ignoreRepeatMs: Math.max(600, repeatMs) }}>
                {t('add')}
              </Button>
            )}
            <div className={styles.tools}>
              <Button variant="ghost" icon={<Settings />} onActivate={() => requestUnlock(() => setSetupOpen(true))}>
                {t('setup')}
              </Button>
              <Button variant="ghost" icon={<RotateCcw />} disabled={board.count === 0 || complete} onActivate={() => setConfirmReset(true)}>
                {t('reset')}
              </Button>
            </div>
          </section>
        </div>

        <Dialog
          open={setupOpen && !picking}
          onClose={() => setSetupOpen(false)}
          title={t('setupTitle')}
          footer={<Button onActivate={() => setSetupOpen(false)}>{tc('done')}</Button>}
        >
          <div className={styles.setupBlock}>
            <p className={styles.setupLabel}>{t('goal')}</p>
            <div className={styles.goals} role="group" aria-label={t('goal')}>
              {GOALS.map((g) => (
                <Pressable key={g} className={styles.goal} label={t('goalN', { n: g })} pressed={board.goal === g} onActivate={() => setBoard(setGoal(board, g))}>
                  {g}
                </Pressable>
              ))}
            </div>
          </div>
          <div className={styles.setupBlock}>
            <p className={styles.setupLabel}>{t('reward')}</p>
            <div className={styles.setupReward}>
              {reward && (
                <span className={styles.setupRewardArt} aria-hidden="true">
                  <CardArt card={reward} />
                </span>
              )}
              <span className={styles.rewardName}>{reward ? label(reward.label) : t('noReward')}</span>
              <Button variant="soft" onActivate={() => setPicking(true)}>
                {t('chooseReward')}
              </Button>
            </div>
          </div>
        </Dialog>

        <CardPicker
          open={picking}
          onClose={() => setPicking(false)}
          onPick={(ref) => setBoard(setReward(board, ref))}
          groups={REWARD_GROUPS}
          title={t('pickRewardTitle')}
        />

        <Dialog
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          title={t('resetTitle')}
          footer={
            <>
              <Button variant="ghost" onActivate={() => setConfirmReset(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onActivate={() => {
                  setBoard(resetBoard(board))
                  setConfirmReset(false)
                }}
              >
                {t('reset')}
              </Button>
            </>
          }
        >
          <p>{t('resetText')}</p>
        </Dialog>

        {gate}
      </Page>
    </>
  )
}
