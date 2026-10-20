import { ArrowRight, RotateCcw, Undo2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { playSfx } from '../../audio/sfx'
import { speakSequence } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import type { ScheduleItem } from '../../store/db'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { voice, type CardView } from './cards'
import { CardArt } from './CardPicker'
import { DoneBar } from './DoneBar'
import { allDone, currentIndex, resetDone, setDone } from './logic'
import styles from './Schedule.module.css'
import { S } from './strings'

type SlotState = 'active' | 'waiting' | 'done'

export function DoneCheck() {
  const preset = useMotionPreset()
  return (
    <motion.span
      className={styles.check}
      aria-hidden="true"
      initial={{ opacity: 0, scale: preset.movement ? 0.8 : 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={preset.pop}
    >
      <SymbolImg id="check_mark_button" />
    </motion.span>
  )
}

/** "Avval → Keyin / Сначала → Потом": two big slots; the first is active until marked done. */
export function FirstThen({
  items,
  cards,
  editing,
  onUpdate,
  onChange,
}: {
  items: ScheduleItem[]
  cards: Array<CardView | null>
  editing: boolean
  onUpdate: (fn: (items: ScheduleItem[]) => ScheduleItem[]) => void
  onChange: (index: number) => void
}) {
  const t = useStrings(S)
  const label = useLabel()
  const preset = useMotionPreset()
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const thenRef = useRef<HTMLElement>(null)
  const focusThen = useRef(false)
  const cur = currentIndex(items)
  const finished = allDone(items)
  const bar = !editing && !finished && cur >= 0

  useEffect(() => {
    if (focusThen.current && cur === 1) {
      focusThen.current = false
      const el = thenRef.current
      el?.focus({ preventScroll: true })
      el?.closest('section')?.scrollIntoView({ block: 'nearest', behavior: preset.movement ? 'smooth' : 'auto' })
    }
  }, [cur, preset.movement])

  const slotWord = (i: number) => voice(i === 0 ? 'sched_first' : 'sched_then')

  // A finished slot can be taken back with one gentle tap (no confirmation): a slip of the finger is not final.
  const undo = (i: number) => {
    onUpdate((list) => setDone(list, i, false))
    playSfx('soft')
  }

  const markDone = (i: number) => {
    const card = cards[i]
    onUpdate((list) => setDone(list, i, true))
    playSfx('soft')
    if (card) logEvent('schedule_done', card.ref, { kind: 'first-then' })
    const next = cards[1]
    if (i === 0 && next) {
      focusThen.current = true
      void speakSequence([voice('sched_item_done'), voice('sched_then'), next.speech])
    } else {
      void speakSequence([voice(adult ? 'sched_item_done' : 'sched_all_done')])
    }
  }

  const slot = (i: number) => {
    const card = cards[i]
    const state: SlotState = items[i]?.done ? 'done' : i === cur ? 'active' : 'waiting'
    const name = card ? label(card.label) : ''
    const head = i === 0 ? t('first') : t('then')
    return (
      <section className={styles.slot} data-state={state} aria-label={head}>
        <h2 className={styles.slotHead}>{head}</h2>
        <Pressable
          ref={i === 1 ? thenRef : undefined}
          className={styles.bigCard}
          label={`${head}: ${name}`}
          scanGroup="first-then"
          onActivate={() => {
            if (state === 'done' && !editing) undo(i)
            if (card) void speakSequence([slotWord(i), card.speech])
          }}
        >
          <span className={styles.bigArt} aria-hidden="true">
            {card && <CardArt card={card} />}
            {state === 'done' && <DoneCheck />}
          </span>
          <span className={styles.bigName}>{name}</span>
        </Pressable>
        {editing ? (
          <Button variant="soft" onActivate={() => onChange(i)}>
            {t('change')}
          </Button>
        ) : state === 'done' ? (
          <Button variant="ghost" icon={<Undo2 />} label={t('undoFor', { name })} scanGroup="first-then" onActivate={() => undo(i)}>
            {t('undo')}
          </Button>
        ) : (
          <span className={styles.slotSpacer} aria-hidden="true" />
        )}
      </section>
    )
  }

  return (
    <div className={styles.ftWrap} data-bar={bar || undefined} data-reach>
      <div className={styles.ft}>
        {slot(0)}
        <span className={styles.ftArrow} aria-hidden="true">
          <ArrowRight />
        </span>
        {slot(1)}
      </div>
      {bar && <DoneBar name={cards[cur] ? label(cards[cur].label) : ''} scanGroup="first-then" onDone={() => markDone(cur)} />}
      {finished && !editing && (
        <div className={styles.finished} role="status">
          <p className={styles.finishedText}>{adult ? t('allDoneAdult') : t('allDone')}</p>
          <Button variant="soft" icon={<RotateCcw />} onActivate={() => onUpdate(resetDone)}>
            {t('again')}
          </Button>
        </div>
      )}
    </div>
  )
}
