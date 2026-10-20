import { Ear, Hand } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speak, stopSpeaking } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import type { Word } from '../../content/types'
import { WORDS } from '../../content/vocab'
import adultStyles from './adult/Adult.module.css'
import { A } from './adult/strings'
import { poolWordsFor } from './logic/pools'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useProfileStore } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Musicha } from '../../ui/mascot/Musicha'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { GameShell } from './GameShell'
import styles from './Games.module.css'
import { makeRound } from './logic/rounds'
import { syllablesOf, syllableWords } from './logic/syllables'
import { useGameSession, wait, type GameSession } from './session'
import { S } from './strings'

let lastTarget: string | undefined

export default function SyllablesGame() {
  const t = useStrings(S)
  const session = useGameSession('syllables')
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  return (
    <GameShell session={session} title={adult ? t('syllablesAdult') : t('syllables')} symbol={adult ? 'microphone' : 'drum'}>
      <Clap key={`${session.round}-${session.level}`} session={session} />
    </GameShell>
  )
}

function Clap({ session }: { session: GameSession }) {
  const t = useStrings(S)
  const a = useStrings(A)
  const adult = useProfileStore((s) => s.profile.kind === 'adult')
  const label = useLabel()
  const preset = useMotionPreset()
  const lang = useProfileStore((s) => s.profile.speechLang)
  const repeatMs = useProfileStore((s) => s.profile.touch.ignoreRepeatMs)
  const level = session.level
  const items = useMemo(() => {
    const r = makeRound(syllableWords(adult ? poolWordsFor('adult') : WORDS, level, lang), { options: 1, size: session.total, previous: lastTarget })
    lastTarget = r[r.length - 1]?.target.id
    return r
  }, [level, lang, adult, session.total])
  const [index, setIndex] = useState(0)
  const [hits, setHits] = useState(0)
  const [demo, setDemo] = useState(-1)
  const [hop, setHop] = useState(0)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (demoTimer.current) clearInterval(demoTimer.current)
    }
  }, [])

  const cur = items[index]
  if (!cur) return null
  const w: Word = cur.target
  const syl = syllablesOf(w, lang)
  const complete = hits >= syl.length

  const stopDemo = () => {
    if (demoTimer.current) clearInterval(demoTimer.current)
    demoTimer.current = null
    setDemo(-1)
  }

  const listenFirst = () => {
    stopDemo()
    setHits(0)
    const curated = w.syllables
    void speak({ key: `g.syl.${w.id}`, text: curated ? { uz: curated.uz.split('-').join(', '), ru: curated.ru.split('-').join(', ') } : { uz: w.uz, ru: w.ru } })
    // Beads light one by one in time with the model, then rest.
    let k = 0
    setDemo(0)
    demoTimer.current = setInterval(() => {
      k++
      if (k >= syl.length + 1) stopDemo()
      else setDemo(k)
    }, 620)
  }

  const drum = async () => {
    if (busy || complete) return
    stopDemo()
    const n = hits + 1
    setHits(n)
    setHop((h) => h + 1)
    playSfx('tap')
    if (n < syl.length) return
    setBusy(true)
    await wait(250)
    stopSpeaking()
    await speak({ key: `w.${w.id}`, text: { uz: w.uz, ru: w.ru } }).catch(() => undefined)
    await wait(600)
    if (!alive.current) return
    session.itemDone()
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setHits(0)
      setBusy(false)
    }
  }

  const lit = (i: number) => (demo >= 0 ? i <= demo && demo < syl.length : i < hits)

  return (
    <div className={styles.clap}>
      <div className={styles.clapShow}>
        <div className={styles.clapPicture}>
          <SymbolImg id={w.symbol} />
        </div>
        <div className={styles.clapWordRow}>
          <p className={styles.clapWord}>{shy(label(w), lang === 'ru' ? 'ru' : 'uz')}</p>
          <Button variant="soft" icon={<Ear />} onActivate={listenFirst}>
            {t('listenFirst')}
          </Button>
        </div>
        <div className={styles.beadRow}>
          <ol className={adult ? adultStyles.beadsPlain : styles.beads} aria-label={syl.map((s) => label({ uz: s, ru: s })).join(' - ')}>
            {syl.map((s, i) => (
              <motion.li
                key={i}
                className={adult ? adultStyles.bead : styles.bead}
                data-on={lit(i) || undefined}
                animate={preset.movement && lit(i) ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {label({ uz: s, ru: s })}
              </motion.li>
            ))}
          </ol>
          {!adult && (
            <span className={styles.clapMascot} aria-hidden="true">
              <Musicha key={hop} state={complete ? 'happy' : hop ? 'happy' : 'idle'} size={84} calm={!preset.idleLoops} title="" />
            </span>
          )}
        </div>
      </div>

      <div className={styles.clapControls} data-reach>
        {adult ? (
          <Button variant="primary" size="xl" icon={<Hand />} touch={{ ignoreRepeatMs: Math.min(repeatMs, 180) }} disabled={complete} onActivate={() => void drum()}>
            {a('sylTap')}
          </Button>
        ) : (
          <Pressable
            className={styles.drum}
            label={t('drum')}
            data-done={complete || undefined}
            touch={{ ignoreRepeatMs: Math.min(repeatMs, 180) }}
            onActivate={() => void drum()}
          >
            <span className={styles.drumPic} aria-hidden="true">
              <SymbolImg id="drum" />
            </span>
          </Pressable>
        )}
      </div>
    </div>
  )
}
