import { useCallback, useEffect, useRef, useState } from 'react'
import { speak, speakSequence, stopSpeaking, type SpeakItem } from '../../audio/speech'
import { STICKERS } from '../../content/stickers'
import type { Sticker } from '../../content/types'
import { VOICE_LINES } from '../../content/voiceLines'
import type { Bi } from '../../i18n/types'
import { logEvent } from '../../store/events'
import { getProfile } from '../../store/profile'
import { loadLevel, saveLevel } from './logic/levelKey'
import { HINT_DELAY_MS, pickSticker, REST_AFTER_ROUNDS, ROUND_SIZE, type GameId, type Level } from './logic/rounds'
import { ownedStickerIds, recordSticker } from './stickers'

/** A fixed voice line (VOICE_LINES) as a speakable item. */
export function line(id: string): SpeakItem {
  const v = VOICE_LINES.find((l) => l.id === id)
  return { key: `v.${id}`, text: v ? { uz: v.uz, ru: v.ru } : { uz: '', ru: '' } }
}

export function item(key: string, text: Bi): SpeakItem {
  return { key, text }
}

const PRAISE = ['praise_barakalla', 'praise_yaxshi', 'praise_zor', 'praise_ajoyib', 'praise_ofarin', 'praise_mana_shunday']

export function praise(): SpeakItem {
  return line(PRAISE[Math.floor(Math.random() * PRAISE.length)])
}

async function awardSticker(): Promise<Sticker> {
  const profileId = getProfile().id
  const s = pickSticker(STICKERS, await ownedStickerIds(profileId))
  void recordSticker(profileId, s.id)
  return s
}

export type SessionPhase = 'play' | 'reward'

export interface GameSession {
  gameId: GameId
  /** Difficulty of the round on screen. It never changes in the middle of a round. */
  level: Level
  /** The difficulty chosen for the next round (equals `level` unless it was just changed). */
  nextLevel: Level
  /** Remembers a new difficulty; it applies from the next round, so no progress is lost. */
  setLevel: (l: Level) => void
  /** Changes whenever a fresh round starts (use as a React key / effect dependency). */
  round: number
  done: number
  total: number
  phase: SessionPhase
  sticker: Sticker | null
  roundsDone: number
  /** True on the reward screen after every REST_AFTER_ROUNDS-th round. */
  suggestRest: boolean
  /** One item finished (any attempt counts); the round ends after `total` items. */
  itemDone: () => void
  /** Ends the round now (e.g. a memory board is complete). */
  finishRound: (meta?: Record<string, unknown>) => void
  nextRound: () => void
}

/** Shared round/level/reward state of a game. Stops speech when the game screen closes. */
export function useGameSession(gameId: GameId, total: number = ROUND_SIZE): GameSession {
  // The level is the child's own (per profile id) and is read once per game screen.
  const profileId = useRef(getProfile().id).current
  const [level, setLevelState] = useState<Level>(() => loadLevel(profileId, gameId))
  const [nextLevel, setNextLevel] = useState<Level>(level)
  const nextLevelRef = useRef(level)
  const [round, setRound] = useState(0)
  const [done, setDone] = useState(0)
  const [phase, setPhase] = useState<SessionPhase>('play')
  const [sticker, setSticker] = useState<Sticker | null>(null)
  const [roundsDone, setRoundsDone] = useState(0)
  const alive = useRef(true)
  const doneRef = useRef(0)
  const levelRef = useRef(level)
  levelRef.current = level

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      stopSpeaking()
    }
  }, [])

  const finishRound = useCallback(
    (meta?: Record<string, unknown>) => {
      logEvent('game_round', gameId, { level: levelRef.current, ...meta })
      const rounds = roundsDone + 1
      setRoundsDone(rounds)
      setPhase('reward')
      setSticker(null)
      void awardSticker().then((s) => {
        if (!alive.current) return
        setSticker(s)
        const lines = [praise(), line('sticker_got')]
        if (rounds % REST_AFTER_ROUNDS === 0) lines.push(line('rest'))
        void speakSequence(lines)
      })
    },
    [gameId, roundsDone],
  )

  const itemDone = useCallback(() => {
    doneRef.current += 1
    setDone(doneRef.current)
    if (doneRef.current >= total) finishRound()
  }, [finishRound, total])

  const restart = useCallback(() => {
    // A level chosen during the round starts now, with the fresh round.
    setLevelState(nextLevelRef.current)
    doneRef.current = 0
    setDone(0)
    setPhase('play')
    setSticker(null)
    setRound((r) => r + 1)
  }, [])

  const setLevel = useCallback(
    (l: Level) => {
      saveLevel(profileId, gameId, l)
      nextLevelRef.current = l
      setNextLevel(l)
    },
    [gameId, profileId],
  )

  const nextRound = useCallback(() => {
    stopSpeaking()
    restart()
  }, [restart])

  return {
    gameId,
    level,
    nextLevel,
    setLevel,
    round,
    done,
    total,
    phase,
    sticker,
    roundsDone,
    suggestRest: phase === 'reward' && roundsDone > 0 && roundsDone % REST_AFTER_ROUNDS === 0,
    itemDone,
    finishRound,
    nextRound,
  }
}

/** Errorless learning: true once the current item has been on screen for HINT_DELAY_MS. */
export function useHint(itemKey: string, active: boolean, delay: number = HINT_DELAY_MS): boolean {
  const [hintFor, setHintFor] = useState<string | null>(null)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setHintFor(itemKey), delay)
    return () => clearTimeout(t)
  }, [itemKey, active, delay])
  return active && hintFor === itemKey
}

/** Speaks and resolves when done (never rejects). */
export async function say(key: string, text: Bi): Promise<void> {
  try {
    await speak({ key, text })
  } catch {
    /* speech must never break a game */
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
