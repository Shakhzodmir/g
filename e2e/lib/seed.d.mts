import type { Page } from '@playwright/test'

export const NAMES: Record<'uz' | 'uzc' | 'ru', { child: string; adult: string }>
export function deviceJson(o?: Record<string, unknown>): string
export function seedApp(page: Page, base: string, opts?: Record<string, unknown>): Promise<void>
export function demoRows(profileId?: string): Record<string, unknown[]>
