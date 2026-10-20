import { motion, useAnimate } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speakSequence } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { useProfileStore } from '../../store/profile'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { GameShell } from './GameShell'
import { gameLine, kidWords, lastTarget, lineBi, lineItem, setLastTarget, wordItem } from './kidCommon'
import { K } from './kidStrings'
import styles from './Kid.module.css'
import { hintBead, isNextSyllable, makeBuildRound, type Bead } from './logic/buildword'
import { PromptBar } from './PromptBar'
import { item, useGameSession, useHint, wait, type GameSession } from './session'
import { S } from './strings'

/** «Soʻz yigʻ / Собери слово»: tap the syllable beads in order to build the word of the picture. No dragging. */
export default function BuildWordGame() {
  const t = useStrings(K)
  const session = useGameSession('build')
  return (
    <GameShell session={session} title={t('build')} symbol="blocks">
      <Build key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Build({ session }: { session: GameSession }) {
  const t = useStrings(S)
  const k = useStrings(K)
  const label = useLabel()
  const lang = useProfileStore((s) => s.profile.speechLang)
  const level = session.level
  const items = useMemo(() => {
    const r = makeBuildRound(kidWords(), level, lang, Math.random, lastTarget('build'))
    setLastTarget('build', r[r.length - 1]?.word.id)
    return r
  }, [level, lang])
  const [index, setIndex] = useState(0)
  const [used, setUsed] = useState<number[]>([]) // bead ids in the order they were placed
  const [solved, setSolved] = useState(false)
  const [wiggles, setWiggles] = useState<Record<number, number>>({})
  const missed = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const cur = items[index]
  const ask = gameLine('g.build.ask')
  useEffect(() => {
    const c = items[index]
    if (c) void speakSequence([wordItem(c.word), lineItem(gameLine('g.build.ask'))])
  }, [index, items])
  const hint = useHint(`${index}.${used.length}`, !solved)
  if (!cur) return null

  const placed = used.length
  const hintId = hint ? hintBead(cur, new Set(used), placed) : undefined
  const syl = (s: string) => label({ uz: s, ru: s })

  const tapBead = async (b: Bead) => {
    if (solved || used.includes(b.id)) return
    if (!isNextSyllable(cur, placed, b.text)) {
      missed.current = true
      setWiggles((w) => ({ ...w, [b.id]: (w[b.id] ?? 0) + 1 }))
      return
    }
    const next = [...used, b.id]
    setUsed(next)
    playSfx('pop')
    if (next.length < cur.syllables.length) return
    setSolved(true)
    await speakSequence([item(`g.syl.${cur.word.id}`, { uz: cur.word.syllables?.uz.split('-').join(', ') ?? cur.word.uz, ru: cur.word.syllables?.ru.split('-').join(', ') ?? cur.word.ru }), wordItem(cur.word)])
    await wait(500)
    if (!alive.current) return
    const ok = !missed.current
    missed.current = false
    session.itemDone(ok, { word: cur.word.id })
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setUsed([])
      setSolved(false)
      setWiggles({})
    }
  }

  return (
    <div className={styles.build}>
      <PromptBar text={label(lineBi(ask))} listenLabel={t('listenAgain')} onListen={() => void speakSequence([wordItem(cur.word), lineItem(ask)])} />
      <span className={styles.buildPic} role="img" aria-label={`${k('word')}: ${label(cur.word)}`}>
        <SymbolImg id={cur.word.symbol} />
      </span>
      <ol className={styles.slots} aria-label={k('word')}>
        {cur.syllables.map((_, i) => {
          const bead = used[i] !== undefined ? cur.beads.find((b) => b.id === used[i]) : undefined
          return (
            <li key={i} className={styles.slot} data-filled={bead ? '' : undefined} data-done={solved ? '' : undefined} aria-label={bead ? syl(bead.text) : k('answerSlot', { n: i + 1 })}>
              {bead ? syl(bead.text) : null}
            </li>
          )
        })}
      </ol>
      <ul className={styles.tray} role="list" aria-label={k('tray')} data-reach>
        {cur.beads.map((b) => (
          <li key={b.id}>
            <BeadButton text={syl(b.text)} used={used.includes(b.id)} hint={hintId === b.id} wiggle={wiggles[b.id] ?? 0} onTap={() => void tapBead(b)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BeadButton({ text, used, hint, wiggle, onTap }: { text: string; used: boolean; hint: boolean; wiggle: number; onTap: () => void }) {
  const preset = useMotionPreset()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  useEffect(() => {
    if (!wiggle || !scope.current) return
    if (preset.movement) void animate(scope.current, { x: [0, -7, 6, -4, 3, 0] }, { duration: 0.45, ease: 'easeInOut' })
    else void animate(scope.current, { opacity: [1, 0.6, 1] }, { duration: 0.3 })
  }, [wiggle, animate, preset.movement, scope])
  return (
    <Pressable className={styles.bead} data-used={used ? '' : undefined} data-hint={hint ? '' : undefined} label={text} disabled={used} onActivate={onTap}>
      <motion.span ref={scope} style={{ display: 'block' }}>
        {text}
      </motion.span>
    </Pressable>
  )
}
