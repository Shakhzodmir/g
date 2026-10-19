import { Check, Lock, Printer } from 'lucide-react'
import { useState } from 'react'
import { SCHEDULE_TEMPLATES } from '../../content/schedules'
import { useI18n, useStrings } from '../../i18n'
import { COMMON } from '../../i18n/common'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { useCardViews, useCustomCards } from './cards'
import { CardPicker } from './CardPicker'
import { DayStrip } from './DayStrip'
import { FirstThen } from './FirstThen'
import { addItem, itemsFrom, replaceItem, type ScheduleKind } from './logic'
import { PrintSheet } from './PrintSheet'
import styles from './Schedule.module.css'
import { S } from './strings'
import { useAdultUnlock } from './useAdultUnlock'
import { useSchedule, useScheduleUi } from './useSchedule'

export default function Schedule() {
  const t = useStrings(S)
  const tc = useStrings(COMMON)
  const { ui } = useI18n()
  const mode = useScheduleUi((s) => s.mode)
  const setMode = useScheduleUi((s) => s.setMode)
  const { row, update } = useSchedule(mode)
  const custom = useCustomCards()
  const refs = row?.items.map((i) => i.ref) ?? []
  const cards = useCardViews(refs, custom)
  const [editing, setEditing] = useState(false)
  const { requestUnlock, gate } = useAdultUnlock()
  // Picker target: an index to replace (first → then slots) or 'add' (day strip).
  const [picking, setPicking] = useState<number | 'add' | null>(null)
  const [confirmTpl, setConfirmTpl] = useState<string | null>(null)

  const tpl = row ? SCHEDULE_TEMPLATES.find((x) => x.id === row.name) : undefined
  const dayTitle = tpl ? ui(tpl.title) : t('myDay')
  const printTitle = mode === 'day' ? dayTitle : t('firstThenTitle')

  const applyTemplate = (id: string) => {
    const tp = SCHEDULE_TEMPLATES.find((x) => x.id === id)
    if (tp) update(() => itemsFrom(tp.items), tp.id)
  }

  return (
    <>
      <PageHeader title={t('title')} symbol={<SymbolImg id="calendar" />} />

      <Page width="normal">
        <div className={styles.screen} data-no-print>
          <div className={styles.modeBar}>
            <Segmented<ScheduleKind>
              label={t('mode')}
              value={mode}
              onChange={(m) => {
                setMode(m)
                setPicking(null)
              }}
              options={[
                { value: 'first-then', label: t('modeFirstThen') },
                { value: 'day', label: t('modeDay') },
              ]}
            />
          </div>

          {editing && <p className={styles.editingBanner}>{t('editing')}</p>}

          {row &&
            (mode === 'first-then' ? (
              <FirstThen items={row.items} cards={cards} editing={editing} onUpdate={update} onChange={(i) => setPicking(i)} />
            ) : (
              <DayStrip
                items={row.items}
                cards={cards}
                title={dayTitle}
                editing={editing}
                onUpdate={update}
                onEdit={(fn) => update(fn, 'custom')}
                onAdd={() => setPicking('add')}
                onTemplate={(id) => (row.items.length ? setConfirmTpl(id) : applyTemplate(id))}
              />
            ))}

          <div className={styles.tools}>
            {editing ? (
              <Button variant="primary" icon={<Check />} onActivate={() => setEditing(false)}>
                {t('editDone')}
              </Button>
            ) : (
              <Button variant="ghost" icon={<Lock />} onActivate={() => requestUnlock(() => setEditing(true))}>
                {t('edit')}
              </Button>
            )}
            <Button variant="ghost" icon={<Printer />} onActivate={() => requestUnlock(() => setTimeout(() => window.print(), 400))}>
              {t('print')}
            </Button>
          </div>
        </div>

        <PrintSheet title={printTitle} cards={cards} kind={mode} />

        <CardPicker
          open={picking !== null}
          onClose={() => setPicking(null)}
          onPick={(ref) => {
            if (picking === 'add') update((l) => addItem(l, ref), mode === 'day' ? 'custom' : undefined)
            else if (typeof picking === 'number') update((l) => replaceItem(l, picking, ref), mode === 'day' ? 'custom' : undefined)
          }}
        />

        <Dialog
          open={confirmTpl !== null}
          onClose={() => setConfirmTpl(null)}
          title={t('replaceTitle')}
          footer={
            <>
              <Button variant="ghost" onActivate={() => setConfirmTpl(null)}>
                {tc('cancel')}
              </Button>
              <Button
                onActivate={() => {
                  if (confirmTpl) applyTemplate(confirmTpl)
                  setConfirmTpl(null)
                }}
              >
                {t('replace')}
              </Button>
            </>
          }
        >
          <p>
            {t('replaceText', {
              name: (() => {
                const tp = SCHEDULE_TEMPLATES.find((x) => x.id === confirmTpl)
                return tp ? ui(tp.title) : ''
              })(),
            })}
          </p>
        </Dialog>

        {gate}
      </Page>
    </>
  )
}
