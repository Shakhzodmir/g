import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { playSfx } from '../../audio/sfx'
import { speak, speakSequence } from '../../audio/speech'
import { useMotionPreset } from '../../design/motion'
import { useI18n, useLabel, useStrings } from '../../i18n'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'
import type { ScheduleItem } from '../../store/db'
import { logEvent } from '../../store/events'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { voice, type CardView } from './cards'
import { CardArt } from './CardPicker'
import { allDone, currentIndex, markCurrentDone, moveItem, removeItem, resetDone } from './logic'
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
    else void speakSequence([voice('sched_all_done')])
  }

  if (editing) {
    return (
      <div className={styles.day}>
        <div className={styles.editTools} data-no-print>
          <p className={styles.editHint}>{t('templates')}</p>
          <div className={styles.templateRow}>
            {SCHEDULE_TEMPLATES.map((tpl) => (
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

  if (items.length === 0) return <EmptyState symbol="spiral_calendar" title={t('empty')} text={t('emptyHint')} />

  return (
    <div className={styles.day}>
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
                <Button size="xl" block onActivate={markDone} label={t('doneFor', { name })} scanGroup="day-current">
                  {t('done')}
                </Button>
              </li>
            )
          }
          return (
            <li key={`${it.ref}-${i}`} className={styles.rowItem} data-done={it.done || undefined}>
              <Pressable className={styles.rowCard} label={it.done ? `${name}: ${t('doneMark')}` : name} onActivate={() => card && void speak(card.speech)}>
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
                    <SymbolImg id="glowing_star" />
                  </motion.span>
                )}
              </Pressable>
            </li>
          )
        })}
      </ol>
      {finished && (
        <div className={styles.finished} role="status">
          <p className={styles.finishedText}>{t('allDone')}</p>
          <Button variant="soft" icon={<RotateCcw />} onActivate={() => onUpdate(resetDone)}>
            {t('again')}
          </Button>
        </div>
      )}
    </div>
  )
}
