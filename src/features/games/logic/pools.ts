import type { TopicId, Word } from '../../../content/types'

/** Topics offered in "Topchi!" — concrete, picturable nouns only. */
export const FIND_TOPICS: TopicId[] = ['food', 'animals', 'toys', 'clothes', 'body', 'people', 'drinks', 'school']

/** Picturable words of a topic (things and people; no feelings, actions or descriptions). */
export function pictureWords(words: readonly Word[], topic: TopicId): Word[] {
  return words.filter((w) => w.topic === topic && (w.fitz === 'thing' || w.fitz === 'people'))
}

/** Memory cards use clear, distinct pictures from a few familiar topics. */
export const MEMORY_TOPICS: TopicId[] = ['food', 'animals', 'toys']

export function memoryWords(words: readonly Word[]): Word[] {
  return MEMORY_TOPICS.flatMap((t) => pictureWords(words, t))
}
