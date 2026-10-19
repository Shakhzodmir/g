import { useMemo, useState } from 'react'
import { STICKERS } from '../../content/stickers'
import { TOPICS } from '../../content/topics'
import { wordsByTopic } from '../../content/vocab'
import { useI18n, useLabel, useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { resolveCard, scheduleActivityRefs, useCustomCards, type CardView } from './cards'
import styles from './CardPicker.module.css'
import { S } from './strings'

/** Picture + label of a card ref (symbol or the family's own photo). */
export function CardArt({ card, size }: { card: CardView; size?: number }) {
  return <SymbolImg id={card.symbol} src={card.photo} size={size} />
}

export type PickerGroup = 'activities' | 'topics' | 'stickers' | 'mine'

const DEFAULT_GROUPS: PickerGroup[] = ['activities', 'mine', 'topics']

interface GroupDef {
  id: string
  symbol: string
  label: string
  refs: string[]
}

/**
 * Adult-facing picker: one group of big picture cards at a time (schedule activities, every vocabulary
 * topic, stickers, the family's own cards). Picking closes the dialog.
 */
export function CardPicker({
  open,
  onClose,
  onPick,
  groups = DEFAULT_GROUPS,
  title,
}: {
  open: boolean
  onClose: () => void
  onPick: (ref: string) => void
  groups?: PickerGroup[]
  title?: string
}) {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const { ui } = useI18n()
  const label = useLabel()
  const custom = useCustomCards()

  const defs = useMemo<GroupDef[]>(() => {
    const out: GroupDef[] = []
    for (const g of groups) {
      if (g === 'activities') out.push({ id: 'activities', symbol: 'spiral_calendar', label: t('groupActivities'), refs: scheduleActivityRefs() })
      if (g === 'stickers') out.push({ id: 'stickers', symbol: 'glowing_star', label: t('groupStickers'), refs: STICKERS.map((s) => `st.${s.id}`) })
      if (g === 'mine' && custom.size > 0) out.push({ id: 'mine', symbol: 'framed_picture', label: t('groupMine'), refs: [...custom.keys()].map((id) => `c.${id}`) })
      if (g === 'topics') {
        for (const tp of TOPICS) out.push({ id: tp.id, symbol: tp.symbol, label: ui(tp), refs: wordsByTopic(tp.id).map((w) => w.id) })
      }
    }
    return out
  }, [groups, custom, t, ui])

  const [groupId, setGroupId] = useState<string | null>(null)
  const group = defs.find((d) => d.id === groupId) ?? defs[0]
  const cards = useMemo(() => (group ? group.refs.map((r) => resolveCard(r, custom)).filter((c): c is CardView => !!c) : []), [group, custom])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? t('pickTitle')}
      footer={
        <Button variant="ghost" onActivate={onClose}>
          {tc('cancel')}
        </Button>
      }
    >
      <div className={styles.groups} role="group" aria-label={t('groups')}>
        {defs.map((d) => (
          <Pressable
            key={d.id}
            className={styles.chip}
            label={d.label}
            pressed={d.id === group?.id}
            scanGroup="picker-groups"
            onActivate={() => setGroupId(d.id)}
          >
            <span className={styles.chipIcon} aria-hidden="true">
              <SymbolImg id={d.symbol} />
            </span>
            <span>{d.label}</span>
          </Pressable>
        ))}
      </div>
      <div className={styles.grid}>
        {cards.map((c) => {
          const name = label(c.label)
          return (
            <Pressable
              key={c.ref}
              className={styles.card}
              label={name}
              data-fitz={c.fitz}
              onActivate={() => {
                onPick(c.ref)
                onClose()
              }}
            >
              <span className={styles.art} aria-hidden="true">
                <CardArt card={c} />
              </span>
              <span className={styles.name}>{name}</span>
            </Pressable>
          )
        })}
      </div>
    </Dialog>
  )
}
