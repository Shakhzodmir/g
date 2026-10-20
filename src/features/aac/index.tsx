import { Eye } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { topicsForKind } from '../../content/topics'
import type { TopicId } from '../../content/types'
import { wordById } from '../../content/vocab'
import { useI18n, useLabel, useStrings } from '../../i18n'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useDevice } from '../../store/device'
import { logEvent } from '../../store/events'
import { useProfile } from '../../store/profile'
import { Button } from '../../ui/Button'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'
import { CoreBoard, TopicBoard } from './Boards'
import { fitzVars } from './Cell'
import { wordEntry, type Entry } from './entry'
import { KeyboardPanel } from './KeyboardPanel'
import { MessageBar } from './MessageBar'
import { PainPanel, PhrasesPanel } from './Phrases'
import { aacSpeak, stopAacSpeech } from './speak'
import { topicCardCount } from './tabs'
import { TopicTabs, type TabItem } from './TopicTabs'
import { useCustomCardCounts } from './useCustomCards'
import { isFull } from './message'
import { useMessage } from './store'
import { S } from './strings'

type Mode = 'phrases' | 'keyboard' | 'pain'
type View = { kind: 'topic'; topic: TopicId } | { kind: Mode }

const MODES: readonly Mode[] = ['phrases', 'keyboard', 'pain']
const GLOW_MS = 1600

interface Tab extends TabItem {
  view: View
}

function useView(topicIds: ReadonlySet<string>): [View, (v: View) => void] {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode')
  const topic = params.get('topic')
  const view: View = MODES.includes(mode as Mode)
    ? { kind: mode as Mode }
    : {
        kind: 'topic',
        topic: topic && topicIds.has(topic) ? (topic as TopicId) : 'core',
      }
  const select = useCallback(
    (v: View) => {
      const next = new URLSearchParams()
      if (v.kind === 'topic') {
        if (v.topic !== 'core') next.set('topic', v.topic)
      } else next.set('mode', v.kind)
      setParams(next, { replace: true })
    },
    [setParams],
  )
  return [view, select]
}

const sameView = (a: View, b: View) => a.kind === b.kind && (a.kind !== 'topic' || (b.kind === 'topic' && a.topic === b.topic))

/** "Gapirish / Говорить": the AAC communicator. */
export default function Aac() {
  const t = useStrings(S)
  const { ui, uiLang } = useI18n()
  const label = useLabel()
  const profile = useProfile()
  const board = useDevice((s) => s.boardMode)
  const wide = useMediaQuery('(min-width: 600px)')
  // Below 420 px the header has no room next to the "Break" button, so the toggle sits by the bar tools.
  const roomy = useMediaQuery('(min-width: 420px)') || profile.kind === 'adult'
  const dispatch = useMessage((s) => s.dispatch)
  const kind = profile.kind
  const topics = useMemo(() => topicsForKind(kind), [kind])
  const topicIds = useMemo(() => new Set<string>(topics.map((x) => x.id)), [topics])
  const [view, setView] = useView(topicIds)
  const customCounts = useCustomCardCounts(profile.id)
  const [modeling, setModeling] = useState(false)
  const [glowKey, setGlowKey] = useState<string | null>(null)
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const adult = profile.kind === 'adult'
  const reader = adult || profile.ageGroup === '8-12' || profile.ageGroup === '13+'

  useEffect(
    () => () => {
      if (glowTimer.current) clearTimeout(glowTimer.current)
    },
    [],
  )
  // Leaving the communicator ends whatever it is saying (a half-spoken sentence must not follow the child away).
  useEffect(() => stopAacSpeech, [])

  /** Modeling: the adult's tap lights the cell up for the child (steady glow, no flashing). */
  const flash = useCallback((key: string) => {
    setGlowKey(key)
    if (glowTimer.current) clearTimeout(glowTimer.current)
    glowTimer.current = setTimeout(() => setGlowKey(null), GLOW_MS)
  }, [])

  /** Standard AAC behaviour: a tap speaks the word at once and adds it to the message (not while modeling). */
  const onTap = useCallback(
    (e: Entry) => {
      if (modeling) {
        aacSpeak({ key: e.key, text: e.text })
        logEvent('aac_model', e.ref)
        flash(e.key)
        return
      }
      // Full bar: the word cannot be added, so it is not spoken either (the child never hears a word that is not
      // in the bar). The bar shows its calm "phrase is ready" state instead.
      const { items, nextUid, noteFullTap } = useMessage.getState()
      if (isFull({ items, nextUid })) {
        noteFullTap()
        return
      }
      aacSpeak({ key: e.key, text: e.text })
      logEvent(e.kind === 'phrase' ? 'aac_phrase' : 'aac_word', e.ref)
      dispatch({
        type: 'add',
        item: {
          key: e.key,
          text: e.text,
          symbol: e.symbol,
          fitz: e.fitz,
          src: e.src,
        },
      })
    },
    [modeling, dispatch, flash],
  )

  const tabs = useMemo(() => {
    const list: Tab[] = []
    const [core, ...rest] = topics
    const count = (id: TopicId) => topicCardCount(kind, id, profile.aac, customCounts.get(id) ?? 0)
    list.push({
      id: core.id,
      view: { kind: 'topic', topic: core.id },
      symbol: core.symbol,
      label: ui(core),
      count: count(core.id),
    })
    list.push({
      id: 'phrases',
      view: { kind: 'phrases' },
      symbol: 'speech_balloon',
      label: t('phrases'),
    })
    if (reader || view.kind === 'keyboard')
      list.push({
        id: 'keyboard',
        view: { kind: 'keyboard' },
        symbol: 'keyboard',
        label: t('keyboard'),
      })
    if (adult || view.kind === 'pain')
      list.push({
        id: 'pain',
        view: { kind: 'pain' },
        symbol: 'face_with_head_bandage',
        label: t('pain'),
      })
    for (const tp of rest)
      list.push({
        id: tp.id,
        view: { kind: 'topic', topic: tp.id },
        symbol: tp.symbol,
        label: ui(tp),
        count: count(tp.id),
      })
    return list
  }, [ui, t, reader, adult, view.kind, topics, kind, profile.aac, customCounts])

  /** The big Yes / No pair answers at once: it speaks, but does not go into the message. */
  const answers = [wordById('yes'), wordById('no')].filter((w) => w !== undefined)
  const answer = (e: Entry) => {
    aacSpeak({ key: e.key, text: e.text })
    logEvent(modeling ? 'aac_model' : 'aac_word', e.ref)
    if (modeling) flash(e.key)
  }

  const modelToggle = (
    <Button
      variant={modeling ? 'warm' : 'soft'}
      iconOnly={!wide}
      icon={<Eye />}
      label={t('modeling')}
      pressed={modeling}
      scanGroup={roomy ? undefined : 'bar'}
      onActivate={() => setModeling((m) => !m)}
    >
      {t('modeling')}
    </Button>
  )

  const panelName = tabs.find((x) => sameView(x.view, view))?.label ?? t('board')

  return (
    <div className={styles.screen} data-kind={profile.kind} data-board={board || undefined}>
      <div className={styles.layout}>
        <div className={styles.head}>
          <PageHeader title={t('title')} symbol={wide ? <SymbolImg id="speaking_head" /> : undefined} actions={roomy ? modelToggle : undefined} />
        </div>

        <div className={styles.barArea}>
          <MessageBar aac={profile.aac} modeling={modeling} compact={!roomy} />
        </div>

        {/* Topics + board + Yes/No: what a child presses. One block; the reach zone on a whiteboard (display: contents elsewhere). */}
        <div className={styles.zone} data-reach>
        <TopicTabs
          tabs={tabs}
          activeId={tabs.find((x) => sameView(x.view, view))?.id ?? null}
          onSelect={(id) => {
            const tab = tabs.find((x) => x.id === id)
            if (tab) setView(tab.view)
          }}
          hy={uiLang === 'ru' ? 'ru' : 'uz'}
        />

        <section className={styles.panel} aria-label={panelName} data-view={view.kind === 'topic' ? view.topic : view.kind}>
          {view.kind === 'topic' && view.topic === 'core' && <CoreBoard kind={kind} aac={profile.aac} onTap={onTap} glowKey={glowKey} name={panelName} />}
          {view.kind === 'topic' && view.topic !== 'core' && (
            <TopicBoard
              key={view.topic}
              kind={kind}
              topic={view.topic}
              profileId={profile.id}
              aac={profile.aac}
              onTap={onTap}
              glowKey={glowKey}
              name={panelName}
            />
          )}
          {view.kind === 'phrases' && <PhrasesPanel adult={adult} onTap={onTap} glowKey={glowKey} name={panelName} />}
          {view.kind === 'pain' && <PainPanel onTap={onTap} glowKey={glowKey} />}
          {view.kind === 'keyboard' && <KeyboardPanel />}
        </section>

        <div className={styles.dock} data-extra={roomy ? undefined : 'true'}>
          <div className={styles.dockAnswers} role="group" aria-label={t('answer')}>
            {answers.map((w) => {
              const e = wordEntry(w)
              return (
                <Pressable
                  key={w.id}
                  className={styles.yn}
                  label={label(w)}
                  scanGroup="answer"
                  style={profile.aac.colorCoding ? fitzVars(w.fitz) : undefined}
                  data-color={profile.aac.colorCoding ? 'true' : 'false'}
                  data-glow={glowKey === e.key ? 'true' : undefined}
                  onActivate={() => answer(e)}
                >
                  <span className={styles.ynSymbol} aria-hidden="true">
                    <SymbolImg id={w.symbol} />
                  </span>
                  <span>{label(w)}</span>
                </Pressable>
              )
            })}
          </div>
          {!roomy && modelToggle}
        </div>
        </div>
      </div>
    </div>
  )
}
