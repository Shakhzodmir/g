import type { Fitz } from '../../content/types'

/** Pure helpers shared by the adult-area screens and the backup code (no React, no browser APIs). */

export const FITZ: Fitz[] = ['people', 'action', 'describe', 'thing', 'social', 'question', 'negation', 'misc']

export const AVATARS = ['dove', 'cat', 'dog_face', 'rabbit', 'owl', 'turtle', 'butterfly', 'lion', 'tulip', 'sunflower'] as const

export const MAX_NAME_LEN = 30
export const MAX_LABEL_LEN = 40

/** Zero-width, bidi-control, soft-hyphen and other invisible characters that make a name look empty. */
// eslint-disable-next-line no-misleading-character-class
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g

/** Text typed by a person: invisible and control characters removed, whitespace collapsed, trimmed, cut to `max` characters. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  const s = value.normalize('NFC').replace(INVISIBLE, '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()
  const chars = Array.from(s)
  return chars.length > max ? chars.slice(0, max).join('').trim() : s
}

/** Profile name: required, so an all-invisible string counts as empty. */
export function cleanName(value: unknown): string {
  return cleanText(value, MAX_NAME_LEN)
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'])

/** Ids that become database keys: short, printable ASCII, and never an Object.prototype name. */
export function isSafeId(v: unknown, max = 100): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > max) return false
  if (!/^[A-Za-z0-9][\w.:-]*$/.test(v)) return false
  return !v.split(/[.:]/).some((part) => FORBIDDEN_IDS.has(part))
}

const RU_TO_LATN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
}

/** Latin ASCII slug of a name, also for Cyrillic (Russian and Uzbek) names: `Азиз Каримов` → `aziz-karimov`. */
export function asciiSlug(name: string, max = 24): string {
  const latin = Array.from(name.toLowerCase())
    .map((ch) => RU_TO_LATN[ch] ?? ch)
    .join('')
  return (
    latin
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/, '') || 'profil'
  )
}

export type StorageProblem = 'unavailable' | 'quota' | 'other'

/** Why a database write failed: no IndexedDB at all (private mode / blocked) is not the same as a full disk. */
export function storageProblem(err: unknown, available: boolean): StorageProblem {
  if (!available) return 'unavailable'
  const name = (err as { name?: string } | null)?.name ?? ''
  const inner = (err as { inner?: { name?: string } } | null)?.inner?.name ?? ''
  if (name === 'QuotaExceededError' || inner === 'QuotaExceededError' || /quota/i.test(String((err as Error | null)?.message ?? ''))) return 'quota'
  return 'other'
}
