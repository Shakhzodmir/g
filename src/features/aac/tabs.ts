import type { TopicId } from '../../content/types'
import { wordsForKind } from '../../content/vocab'
import type { AacSettings } from '../../store/profile'
import { buildCoreBoard } from './core'

/**
 * How many cards a topic tab promises. It counts exactly what the board draws: the built-in words of this kind that
 * are not hidden (the core board: the words of the chosen level), plus the profile's own visible cards (`custom`).
 * Hidden words leave an empty place on the board and are not counted.
 */
export function topicCardCount(kind: 'child' | 'adult', topic: TopicId, aac: Pick<AacSettings, 'level' | 'hiddenWordIds'>, custom = 0): number {
  const words = wordsForKind(kind)
  if (topic === 'core') return buildCoreBoard(words, aac.level, aac.hiddenWordIds).filter((c) => c.word).length
  const hidden = new Set(aac.hiddenWordIds)
  return words.filter((w) => w.topic === topic && !hidden.has(w.id)).length + custom
}
