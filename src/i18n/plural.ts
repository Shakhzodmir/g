/** Russian plural form: 1 раз, 2 раза, 5 раз (21 раз, 12 раз). */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const FORMS = /([^\s|]+)\|([^\s|]+)\|([^\s|]+)/

/**
 * Picks the Russian plural form written inside a UI string as `слово|слова|слов` for the number `n`
 * ("{n} слово|слова|слов" with n = 40 becomes "40 слов"). Strings without three forms are returned unchanged,
 * so the same call is safe for Uzbek, which has no such forms.
 */
export function pluralizeForms(text: string, n: number): string {
  return text.replace(FORMS, (_m, one: string, few: string, many: string) => pluralRu(Math.abs(Math.trunc(n)), one, few, many))
}
