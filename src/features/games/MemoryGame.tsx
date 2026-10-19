import { User, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { speak } from '../../audio/speech'
import { playSfx } from '../../audio/sfx'
import { wordById, WORDS } from '../../content/vocab'
import { useMotionPreset } from '../../design/motion'
import { useLabel, useStrings } from '../../i18n'
import type { TouchSettings } from '../../store/profile'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { sample } from '../../lib/random'
import { GameShell } from './GameShell'
import styles from './Games.module.css'
import { createMemory, flip, matchedPairs, MEMORY_GRID, memoryPairs, settle, type MemState } from './logic/memory'
import { memoryWords } from './logic/pools'
import type { Level } from './logic/rounds'
import { ModeSwitch } from './ModeSwitch'
import { useGameSession, wait } from './session'
import { S } from './strings'

type Players = '1' | '2'

export default function MemoryGame() {
  const t = useStrings(S)
  const session = useGameSession('memory')
  const board = useDevice((s) => s.boardMode)
  const [players, setPlayers] = useState<Players>('2')
  const two = board && players === '2'
  const [finished, setFinished] = useState<Record<number, boolean>>({})

  const finishedRef = useRef(new Set<number>())
  useEffect(() => {
    finishedRef.current = new Set()
    setFinished({})
  }, [session.round])

  const onBoardDone = (player: number) => {
    finishedRef.current.add(player)
    setFinished((f) => ({ ...f, [player]: true }))
    const needed = two ? [1, 2] : [1]
    if (needed.every((p) => finishedRef.current.has(p))) void wait(900).then(() => session.finishRound({ players: two ? 2 : 1 }))
  }

  return (
    <GameShell
      session={session}
      title={t('memory')}
      symbol="puzzle_piece"
      showProgress={false}
      toolbar={
        board ? (
          <ModeSwitch<Players>
            label={t('players')}
            value={players}
            onChange={(p) => {
              setPlayers(p)
              session.nextRound()
            }}
            options={[
              { value: '1', label: t('onePlayer'), icon: <User /> },
              { value: '2', label: t('twoPlayers'), icon: <Users /> },
            ]}
          />
        ) : undefined
      }
    >
      <div className={styles.memoryStage}>
      {two ? (
        <div className={styles.twoBoards}>
          {[1, 2].map((p) => (
            <section key={`${session.round}-${session.level}-${p}`} className={styles.playerZone} aria-label={t('player', { n: p })} data-player={p}>
              <MemoryBoard level={session.level} multiTouch onDone={() => onBoardDone(p)} heading={t('player', { n: p })} done={!!finished[p]} />
            </section>
          ))}
        </div>
      ) : (
        <MemoryBoard key={`${session.round}-${session.level}`} level={session.level} onDone={() => onBoardDone(1)} done={!!finished[1]} />
      )}
      </div>
    </GameShell>
  )
}

function MemoryBoard({ level, onDone, multiTouch, heading, done }: { level: Level; onDone: () => void; multiTouch?: boolean; heading?: string; done: boolean }) {
  const t = useStrings(S)
  const label = useLabel()
  const preset = useMotionPreset()
  const profileTouch = useProfileStore((s) => s.profile.touch)
  const grid = MEMORY_GRID[level]
  const [state, setState] = useState<MemState>(() => createMemory(sample(memoryWords(WORDS), memoryPairs(level)).map((w) => w.id)))
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneFired = useRef(false)
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  // Two children on one board: each touch is handled on its own pointer-down (no shared repeat guard),
  // unless the profile needs a hold for tremor.
  const touch: Partial<TouchSettings> | undefined = useMemo(
    () => (multiTouch ? (profileTouch.holdMs > 0 ? { ignoreRepeatMs: 0 } : { ignoreRepeatMs: 0, activateOnRelease: false }) : undefined),
    [multiTouch, profileTouch.holdMs],
  )

  const tap = (i: number) => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    const next = flip(state, i)
    if (next === state) return
    setState(next)
    const card = next.cards[i]
    const w = wordById(card.pairId)
    if (w && card.faceUp) void speak({ key: `w.${w.id}`, text: { uz: w.uz, ru: w.ru } })
    if (next.phase === 'match') {
      playSfx('chime')
      settleTimer.current = setTimeout(() => setState((s) => settle(s)), 700)
    } else if (next.phase === 'miss') {
      settleTimer.current = setTimeout(() => setState((s) => settle(s)), 1400)
    } else if (next.phase === 'done' && !doneFired.current) {
      doneFired.current = true
      playSfx('chime')
      onDone()
    }
  }

  const found = matchedPairs(state)
  const pairs = memoryPairs(level)
  return (
    <div className={styles.memoryWrap}>
      {heading && (
        <p className={styles.playerHead}>
          {heading}
          {done && <span className={styles.playerDone}> · {t('playerDone')}</span>}
        </p>
      )}
      <div
        className={styles.memoryBoard}
        data-reach
        data-multi={multiTouch || undefined}
        style={{ '--cols': grid.cols, '--rows': grid.rows } as React.CSSProperties}
        role="grid"
        aria-rowcount={grid.rows}
        aria-colcount={grid.cols}
      >
        {state.cards.map((c, i) => {
          const w = wordById(c.pairId)
          const name = w ? label(w) : c.pairId
          const up = c.faceUp || c.matched
          return (
            <Pressable
              key={c.uid}
              className={styles.memCard}
              data-up={up || undefined}
              data-matched={c.matched || undefined}
              label={up ? name : t('closedCard')}
              touch={touch}
              scanGroup={`mem-${heading ?? ''}-${Math.floor(i / grid.cols)}`}
              onActivate={() => tap(i)}
            >
              {preset.movement ? (
                <motion.span
                  className={styles.memInner}
                  initial={false}
                  animate={{ rotateY: up ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                >
                  <span className={styles.memBack} aria-hidden="true" />
                  <span className={styles.memFront} aria-hidden="true">
                    {w && <SymbolImg id={w.symbol} />}
                  </span>
                </motion.span>
              ) : (
                <span className={styles.memInnerFlat}>
                  <motion.span className={styles.memBackFlat} aria-hidden="true" initial={false} animate={{ opacity: up ? 0 : 1 }} transition={preset.press} />
                  <motion.span className={styles.memFrontFlat} aria-hidden="true" initial={false} animate={{ opacity: up ? 1 : 0 }} transition={preset.press}>
                    {w && <SymbolImg id={w.symbol} />}
                  </motion.span>
                </span>
              )}
            </Pressable>
          )
        })}
      </div>
      <div className={styles.pairDots} role="img" aria-label={t('progress', { n: found, total: pairs })}>
        {Array.from({ length: pairs }, (_, k) => (
          <span key={k} className={styles.dot} data-on={k < found || undefined} />
        ))}
      </div>
    </div>
  )
}
