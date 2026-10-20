import { Hand, ListChecks } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { speakSequence } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { GameShell } from './GameShell'
import { gameLine, lastTarget, lineBi, lineItem, numberItem, setLastTarget } from './kidCommon'
import { K } from './kidStrings'
import { Numeral } from './kidVisuals'
import styles from './Kid.module.css'
import { makeCountRound, nextCount, type CountItem } from './logic/count'
import { ModeSwitch } from './ModeSwitch'
import { PickRound, type PickStep } from './PickRound'
import { useGameSession, useHint, wait, type GameSession } from './session'
import { S } from './strings'
import { PromptBar } from './PromptBar'

type Mode = 'tap' | 'pick'

/** «Sanaymiz / Считаем»: tap the objects one by one (each number is said aloud) or choose the numeral. Levels 1–3, 1–6, 1–10. */
export default function CountGame() {
  const t = useStrings(K)
  const ts = useStrings(S)
  const session = useGameSession('count')
  const [mode, setMode] = useState<Mode>('tap')
  const items = useMemo(
    () => {
      const r = makeCountRound(session.level, Math.random, lastTarget('count') === undefined ? undefined : Number(lastTarget('count')))
      setLastTarget('count', String(r[r.length - 1]?.n))
      return r
    },
    // A new round (or level / mode) deals new numbers.
    [session.round, session.level, mode],
  )
  return (
    <GameShell
      session={session}
      title={t('count')}
      symbol="abacus"
      toolbar={
        <ModeSwitch<Mode>
          label={ts('mode')}
          value={mode}
          onChange={(m) => {
            setMode(m)
            session.nextRound()
          }}
          options={[
            { value: 'tap', label: t('modeTap'), icon: <Hand /> },
            { value: 'pick', label: t('modePick'), icon: <ListChecks /> },
          ]}
        />
      }
    >
      {mode === 'tap' ? <TapCount key={`${session.round}-${session.level}`} session={session} items={items} /> : <PickCount key={`${session.round}-${session.level}`} session={session} items={items} />}
    </GameShell>
  )
}

function Objects({ item, children }: { item: CountItem; children?: (i: number) => ReactNode }) {
  const t = useStrings(K)
  return (
    <ul className={styles.objects} role="list" aria-label={t('objects', { n: item.n })}>
      {Array.from({ length: item.n }, (_, i) => (
        <li key={i}>{children ? children(i) : <span className={styles.obj}><SymbolImg id={item.symbol} /></span>}</li>
      ))}
    </ul>
  )
}

function PickCount({ session, items }: { session: GameSession; items: CountItem[] }) {
  const label = useLabel()
  const steps = useMemo<PickStep[]>(() => {
    const ask = gameLine('g.count.ask')
    return items.map((it) => ({
      sid: `${it.n}.${it.symbol}`,
      prompt: [lineItem(ask)],
      promptText: label(lineBi(ask)),
      header: () => <Objects item={it} />,
      answers: [String(it.n)],
      detail: { n: it.n },
      options: it.options.map((n) => ({ id: String(n), label: label({ uz: String(n), ru: String(n) }), visual: <Numeral n={n} />, speak: [numberItem(n)] })),
    }))
  }, [items, label])
  return <PickRound session={session} steps={steps} />
}

function TapCount({ session, items }: { session: GameSession; items: CountItem[] }) {
  const t = useStrings(S)
  const label = useLabel()
  const [index, setIndex] = useState(0)
  const [counted, setCounted] = useState<number[]>([]) // object indexes in the order they were counted
  const [solved, setSolved] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const cur = items[index]
  const ask = gameLine('g.count.tap')
  useEffect(() => {
    void speakSequence([lineItem(gameLine('g.count.tap'))])
  }, [index])
  const hint = useHint(`${index}.${counted.length}`, !solved)
  if (!cur) return null

  const tap = async (i: number) => {
    if (solved) return
    const at = counted.indexOf(i)
    if (at >= 0) {
      // Counted already: just say its number again.
      void speakSequence([numberItem(at + 1)])
      return
    }
    const k = nextCount(counted.length, cur.n)
    if (k === null) return
    const next = [...counted, i]
    setCounted(next)
    playSfx('tap')
    if (next.length < cur.n) {
      void speakSequence([numberItem(k)])
      return
    }
    setSolved(true)
    await speakSequence([numberItem(k)])
    await wait(700)
    if (!alive.current) return
    session.itemDone(true, { n: cur.n })
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setCounted([])
      setSolved(false)
    }
  }

  const firstFree = Array.from({ length: cur.n }, (_, i) => i).find((i) => !counted.includes(i))
  return (
    <div className={styles.build}>
      <PromptBar text={label(lineBi(ask))} listenLabel={t('listenAgain')} onListen={() => void speakSequence([lineItem(ask)])} />
      <Objects item={cur}>
        {(i) => {
          const at = counted.indexOf(i)
          return <CountObject symbol={cur.symbol} number={at >= 0 ? at + 1 : 0} hint={hint && i === firstFree} onTap={() => void tap(i)} label={label(numberItem(at >= 0 ? at + 1 : counted.length + 1).text)} />
        }}
      </Objects>
      <p aria-live="polite" className={styles.bigPicCaption}>
        {counted.length > 0 ? <span>{counted.length}</span> : <span aria-hidden="true">&nbsp;</span>}
      </p>
    </div>
  )
}

function CountObject({ symbol, number, hint, onTap, label }: { symbol: string; number: number; hint: boolean; onTap: () => void; label: string }) {
  const preset = useMotionPreset()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const prev = useRef(0)
  useEffect(() => {
    if (number && !prev.current && scope.current) {
      if (preset.movement) void animate(scope.current, { y: [0, -10, 0], scale: [1, 1.08, 1] }, { duration: 0.5, ease: 'easeInOut' })
      else void animate(scope.current, { opacity: [1, 0.7, 1] }, { duration: 0.3 })
    }
    prev.current = number
  }, [number, animate, preset.movement, scope])
  return (
    <Pressable className={styles.obj} data-counted={number ? '' : undefined} data-hint={hint ? '' : undefined} label={label} onActivate={onTap}>
      <motion.span ref={scope} style={{ display: 'block', width: '100%', height: '100%' }}>
        <SymbolImg id={symbol} />
      </motion.span>
      {number > 0 && <span className={styles.objNum}>{number}</span>}
    </Pressable>
  )
}
