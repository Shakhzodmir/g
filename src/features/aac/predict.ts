/** Folds a word for matching: lower case, every apostrophe-like mark (ʻ ʼ ‘ ’ ' `) becomes one character. */
export function foldWord(s: string): string {
  return s.toLocaleLowerCase().replace(/['‘’`ʻʼ]/g, "'").replace(/ё/g, 'е')
}

const TOKEN = /[\p{L}\p{M}'‘’`ʻʼ-]+/gu

/** Splits text (a label like "shu yerda" or "он / она", or a typed sentence) into words. */
export function tokenize(text: string): string[] {
  return (text.match(TOKEN) ?? []).map((t) => t.replace(/^-+|-+$/g, '')).filter((t) => t.length > 0)
}

/** The word currently being typed (text after the last space); '' right after a space. */
export function currentPrefix(text: string): string {
  const m = /[^\s]*$/.exec(text)
  return m ? m[0] : ''
}

export interface PredictInput {
  /** Text typed so far. */
  text: string
  /** Dictionary words in display order (e.g. WORDS labels in the speech language). */
  vocab: readonly string[]
  /** Words from the profile's own history, one entry per use (more uses = higher rank). */
  history: readonly string[]
  limit?: number
}

/**
 * Word prediction: prefix match on the word being typed. Words the person used before rank first
 * (by frequency, then recency), then dictionary words in their stable order. With nothing typed yet
 * the most used personal words are offered. Exact matches of the typed word are not repeated.
 */
export function predict({ text, vocab, history, limit = 4 }: PredictInput): string[] {
  const prefix = foldWord(currentPrefix(text))
  const freq = new Map<string, { word: string; count: number; last: number }>()
  history.forEach((raw, i) => {
    for (const word of tokenize(raw)) {
      const k = foldWord(word)
      const e = freq.get(k)
      if (e) {
        e.count++
        e.last = i
      } else freq.set(k, { word, count: 1, last: i })
    }
  })
  const out: string[] = []
  const seen = new Set<string>()
  const push = (word: string) => {
    const k = foldWord(word)
    if (seen.has(k) || out.length >= limit) return
    if (prefix && (!k.startsWith(prefix) || k === prefix)) return
    seen.add(k)
    out.push(word)
  }
  const personal = Array.from(freq.values()).sort((a, b) => b.count - a.count || b.last - a.last)
  for (const e of personal) push(e.word)
  if (!prefix) return out
  for (const label of vocab) for (const word of tokenize(label)) push(word)
  return out
}

/** Replaces the word being typed with `word` and adds a space. */
export function applyPrediction(text: string, word: string): string {
  const prefix = currentPrefix(text)
  return text.slice(0, text.length - prefix.length) + word + ' '
}
