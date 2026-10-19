import type { Word } from '../../content/types'

export const CORE_SIZE = 6

/** One position of the fixed 6×6 core board. `word` is null for an empty (masked or unused) place. */
export interface CoreCell {
  row: number
  col: number
  /** The word at this position, or null when it is above the profile's level, hidden, or unused. */
  word: Word | null
}

/**
 * Builds the fixed 6×6 core board. Words above `level` and hidden words become empty placeholders
 * so that visible words never change position (motor planning).
 */
export function buildCoreBoard(words: readonly Word[], level: 1 | 2 | 3, hiddenIds: readonly string[] = []): CoreCell[] {
  const hidden = new Set(hiddenIds)
  const byPos = new Map<number, Word>()
  for (const w of words) {
    if (!w.core) continue
    const { row, col } = w.core
    if (row < 0 || row >= CORE_SIZE || col < 0 || col >= CORE_SIZE) continue
    byPos.set(row * CORE_SIZE + col, w)
  }
  const cells: CoreCell[] = []
  for (let row = 0; row < CORE_SIZE; row++) {
    for (let col = 0; col < CORE_SIZE; col++) {
      const w = byPos.get(row * CORE_SIZE + col)
      const shown = w && w.core && w.core.level <= level && !hidden.has(w.id)
      cells.push({ row, col, word: shown ? w : null })
    }
  }
  return cells
}
