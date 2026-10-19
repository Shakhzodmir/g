import { FEELINGS, HELPERS, type Feeling, type Helper } from '../../content/feelings'

const HELPER_BY_ID = new Map(HELPERS.map((h) => [h.id, h]))

export function feelingById(id: string | undefined): Feeling | undefined {
  return id ? FEELINGS.find((f) => f.id === id) : undefined
}

export function helperById(id: string | null | undefined): Helper | undefined {
  return id ? HELPER_BY_ID.get(id) : undefined
}

/** The helpers offered for a feeling, in the content's order; unknown ids are skipped. */
export function helpersFor(feeling: Feeling): Helper[] {
  return feeling.helps.map((id) => HELPER_BY_ID.get(id)).filter((h): h is Helper => !!h)
}
