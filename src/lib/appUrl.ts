/*
 * The ONE place that knows where the deployed app lives. Printed sheets carry QR codes that open a screen of the app
 * through a HashRouter deep link (`<base>#/talk`), so the address has to be absolute and stable. When the project moves
 * to a custom domain, change DEFAULT_APP_URL (or set VITE_APP_URL when building) and reprint: nothing else knows the host.
 */

/** GitHub Pages address of the deployed app. */
export const DEFAULT_APP_URL = 'https://shakhzodmir.github.io/g/'

/**
 * Normalises a base address: http(s) only, no query or hash, always ends with `/`. Anything that is not a usable
 * address falls back to the default, so a typo in a build variable can never print a broken QR code.
 */
export function normalizeAppBase(raw: string | null | undefined, fallback = DEFAULT_APP_URL): string {
  const text = (raw ?? '').trim()
  if (!text) return fallback
  try {
    const u = new URL(text)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return fallback
    if (!u.hostname || u.username || u.password) return fallback
    return `${u.origin}${u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`}`
  } catch {
    return fallback
  }
}

/** Build-time override (`VITE_APP_URL=https://gapimiz.uz/`), else the default. */
export function appBaseUrl(): string {
  const env = (import.meta.env as Record<string, string | undefined>).VITE_APP_URL
  return normalizeAppBase(env)
}

/**
 * Absolute deep link to a screen: `appUrl('/talk')` → `https://shakhzodmir.github.io/g/#/talk`.
 * `appUrl('/')` is the app's start page. The route may carry a query (`/talk?mode=phrases`).
 */
export function appUrl(route = '/', base: string = appBaseUrl()): string {
  const clean = route.trim().replace(/\s+/g, '').replace(/^#/, '')
  const path = clean.startsWith('/') ? clean : `/${clean}`
  const root = normalizeAppBase(base)
  return path === '/' ? root : `${root}#${path}`
}

/** Short form to print under a QR code so the address can also be typed: no scheme. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}
