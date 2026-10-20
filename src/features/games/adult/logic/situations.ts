import { SITUATIONS, sitKey, type BiTts, type SituationDef } from '../../../../content/adultgamedata'
import type { Level } from '../../logic/rounds'
import { ADULT_ROUND, shuffle, type Rand } from './common'

export interface SituationOption {
  /** Audio key of the phrase (its own clip). */
  key: string
  text: BiTts
  good: boolean
}

export interface SituationItem {
  sit: SituationDef
  options: SituationOption[]
}

/**
 * Options by level: 1 = the right phrase and one from another situation, 2 = the right one, one that fits a neighbouring
 * place and one from elsewhere, 3 = the right one and two phrases that sound fine but do not fit this situation.
 */
export function situationOptions(sd: SituationDef, level: Level, rand: Rand): SituationOption[] {
  const good: SituationOption = { key: sitKey(sd.id, 'good'), text: sd.good, good: true }
  const n1: SituationOption = { key: sitKey(sd.id, 'n1'), text: sd.near[0], good: false }
  const n2: SituationOption = { key: sitKey(sd.id, 'n2'), text: sd.near[1], good: false }
  const far = (): SituationOption => {
    const other = shuffle(
      SITUATIONS.filter((s) => s.id !== sd.id && s.good.uz !== sd.good.uz),
      rand,
    )[0]
    return { key: sitKey(other.id, 'good'), text: other.good, good: false }
  }
  if (level === 1) return shuffle([good, far()], rand)
  if (level === 2) {
    const f = far()
    return shuffle([good, n1, f.text.uz === n1.text.uz ? n2 : f], rand)
  }
  return shuffle([good, n1, n2], rand)
}

export function situationRound(level: Level, rand: Rand = Math.random, size = ADULT_ROUND): SituationItem[] {
  return shuffle(SITUATIONS, rand)
    .slice(0, size)
    .map((sit) => ({ sit, options: situationOptions(sit, level, rand) }))
}
