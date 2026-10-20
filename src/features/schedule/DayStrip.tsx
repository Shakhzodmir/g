import { ArrowDown, ArrowUp, Check, Plus, RotateCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { playSfx } from '../../audio/sfx'
import { speak, speakSequence } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useI18n, useLabel, useStrings } from '../../i18n'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'
import type { ScheduleItem } from '../../store/db'
import { logEvent } from '../../store/events'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { voice, type CardView } from './cards'
import { CardArt } from './CardPicker'
import { DoneBar } from './DoneBar'
import { allDone, currentIndex, markCurrentDone, moveItem, removeItem, resetDone, setDone } from './logic'
import styles from './Schedule.module.css'
import { S } from './strings'

/** "Kun / День": a vertical strip of activities; the current one is enlarged, done ones fade but stay. */
export function DayStrip({
  items,
  cards,
  title,
  editing,
  onUpdate,
  onEdit,
  onAdd,
  onTemplate,
}: {
  items: ScheduleItem[]
  cards: Array<CardView | null>
  title: string
  editing: boolean
  /** Progress changes (done marks); the schedule keeps its name. */
  onUpdate: (fn: (items: ScheduleItem[]) => ScheduleItem[]) => void
  /** Structural edits (order, removal); a template becomes "my day". */
  onEdit: (fn: (items: ScheduleItem[]) => ScheduleItem[]) => void
  onAdd: () => void
  onTemplate: (templateId: string) => void
}) {
  const t = useStrings(S)
  const { ui } = useI18n()
  const label = useLabel()
  const preset = useMotionPreset()
  // Adults: a plain check mark and a plain «Bajarildi / Готово», no star sticker.
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const cur = currentIndex(items)
  const finished = allDone(items)
  const currentRef = useRef<HTMLLIElement>(null)
  const firstRun = useRef(true)

  // Keep the current activity in view (on open after the shell's scroll reset, then after each "done").
  useEffect(() => {
    const el = currentRef.current
    if (!el) return
    const delay = firstRun.current ? 120 : 0
    firstRun.current = false
    const id = setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: preset.movement ? 'smooth' : 'auto' })
    }, delay)
    return () => clearTimeout(id)
  }, [cur, editing, preset.movement])

  const markDone = () => {
    const card = cards[cur]
    onUpdate(markCurrentDone)
    playSfx('soft')
    if (card) logEvent('schedule_done', card.ref, { kind: 'day' })
    const nextCard = cards.slice(cur + 1).find((c, k) => c && !items[cur + 1 + k]?.done)
    if (nextCard) void speakSequence([voice('sched_item_done'), voice('sched_next'), nextCard.speech])
    else void speakSequence([voice(adult ? 'sched_item_done' : 'sched_all_done')])
  }

  // A finished row can be taken back with one gentle tap (no confirmation): a slip of the finger is not final.
  const undo = (i: number) => {
    onUpdate((list) => setDone(list, i, false))
    playSfx('soft')
  }

  if (editing) {
    return (
      <div className={styles.day}>
        <div className={styles.editTools} data-no-print>
          <p className={styles.editHint}>{t('templates')}</p>
          <div className={styles.templateRow}>
            {SCHEDULE_TEMPLATES.filter((tpl) => !(adult && tpl.id === 'kindergarten')).map((tpl) => (
              <Button key={tpl.id} variant="soft" onActivate={() => onTemplate(tpl.id)}>
                {ui(tpl.title)}
              </Button>
            ))}
          </div>
        </div>
        <ol className={styles.strip}>
          {items.map((it, i) => {
            const card = cards[i]
            const name = card ? label(card.label) : '—'
            return (
              <li key={`${it.ref}-${i}`} className={styles.row} data-done={it.done || undefined}>
                <span className={styles.rowArt} aria-hidden="true">
                  {card && <CardArt card={card} />}
                </span>
                <span className={styles.rowName}>{name}</span>
                <span className={styles.rowTools}>
                  <Button variant="soft" iconOnly icon={<ArrowUp />} label={t('moveUp', { name })} disabled={i === 0} onActivate={() => onEdit((l) => moveItem(l, i, -1))}>
                    {t('moveUp', { name })}
                  </Button>
                  <Button
                    variant="soft"
                    iconOnly
                    icon={<ArrowDown />}
                    label={t('moveDown', { name })}
                    disabled={i === items.length - 1}
                    onActivate={() => onEdit((l) => moveItem(l, i, 1))}
                  >
                    {t('moveDown', { name })}
                  </Button>
                  <Button variant="ghost" iconOnly icon={<X />} label={t('remove', { name })} onActivate={() => onEdit((l) => removeItem(l, i))}>
                    {t('remove', { name })}
                  </Button>
                </span>
              </li>
            )
          })}
        </ol>
        <div className={styles.editActions}>
          <Button icon={<Plus />} onActivate={onAdd}>
            {t('add')}
          </Button>
          <Button variant="ghost" icon={<RotateCcw />} disabled={!items.some((i) => i.done)} onActivate={() => onUpdate(resetDone)}>
            {t('resetMarks')}
          </Button>
        </div>
      </div>
    )
  }

  const bar = cur >= 0 && !finished
  if (items.length === 0) return <EmptyState symbol="spiral_calendar" title={t('empty')} text={t('emptyHint')} />

  return (
    <div className={styles.day} data-bar={bar || undefined} data-reach>
      <h2 className={styles.dayTitle}>{title}</h2>
      <ol className={styles.strip}>
        {items.map((it, i) => {
          const card = cards[i]
          const name = card ? label(card.label) : '—'
          if (i === cur) {
            return (
              <li key={`${it.ref}-${i}`} ref={currentRef} className={styles.current} aria-current="step">
                <span className={styles.nowBadge}>{t('now')}</span>
                <Pressable
                  className={styles.currentCard}
                  label={`${t('now')}: ${name}`}
                  scanGroup="day-current"
                  onActivate={() => card && void speakSequence([voice('sched_now'), card.speech])}
                >
                  <span className={styles.currentArt} aria-hidden="true">
                    {card && <CardArt card={card} />}
                  </span>
                  <span className={styles.currentName}>{name}</span>
                </Pressable>
              </li>
            )
          }
          return (
            <li key={`${it.ref}-${i}`} className={styles.rowItem} data-done={it.done || undefined}>
              <Pressable
                className={styles.rowCard}
                label={it.done ? `${name}: ${t('doneMark')}. ${t('undoHint')}` : name}
                onActivate={() => {
                  if (it.done) undo(i)
                  if (card) void speak(card.speech)
                }}
              >
                <span className={styles.rowArt} aria-hidden="true">
                  {card && <CardArt card={card} />}
                </span>
                <span className={styles.rowName}>{name}</span>
                {it.done && (
                  <motion.span
                    className={styles.sticker}
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: preset.movement ? 0.6 : 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={preset.pop}
                  >
                    {adult ? <Check /> : <SymbolImg id="glowing_star" />}
                  </motion.span>
                )}
              </Pressable>
            </li>
          )
        })}
      </ol>
      {bar && <DoneBar name={cards[cur] ? label(cards[cur].label) : ''} scanGroup="day-current" onDone={markDone} />}
      {finished && (
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
