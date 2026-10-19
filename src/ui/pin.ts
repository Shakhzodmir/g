/*
 * Adult PIN hashing. Stored format: `v2$<salt hex>$<PBKDF2-SHA-256 hex>` (the random salt travels with the
 * hash). The first release stored a bare unsalted SHA-256 hex string; verifyPin() still accepts it once so the
 * caller can upgrade it silently.
 */
const ITERATIONS = 60_000

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16))

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(new Uint8Array(digest))
}

async function pbkdf2(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, key, 256)
  return toHex(new Uint8Array(bits))
}

/** Last resort for insecure origins (plain http on a LAN) where SubtleCrypto does not exist. */
function weakMix(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let r = 0; r < 2000; r++) {
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      h1 = Math.imul(h1 ^ c, 2654435761)
      h2 = Math.imul(h2 ^ c, 1597334677)
    }
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = toHex(salt)
  if (!globalThis.crypto?.subtle) return `v2f$${saltHex}$${weakMix(saltHex + pin)}`
  return `v2$${saltHex}$${await pbkdf2(pin, salt)}`
}

export interface PinCheck {
  ok: boolean
  /** True when the stored value is the old unsalted format and should be replaced by hashPin(pin). */
  upgrade: boolean
}

export async function verifyPin(pin: string, stored: string): Promise<PinCheck> {
  try {
    const parts = stored.split('$')
    if (parts[0] === 'v2' && parts.length === 3) return { ok: (await pbkdf2(pin, fromHex(parts[1]))) === parts[2], upgrade: false }
    if (parts[0] === 'v2f' && parts.length === 3) return { ok: weakMix(parts[1] + pin) === parts[2], upgrade: false }
    // Legacy: unsalted SHA-256 of "gapimiz:<pin>".
    return { ok: (await sha256Hex(`gapimiz:${pin}`)) === stored, upgrade: true }
  } catch {
    return { ok: false, upgrade: false }
  }
}

/** Delay in ms before the next attempt is allowed: none for the first 3 failures, then 1 s, 2 s, 4 s … up to 30 s. */
export function pinLockMs(failures: number): number {
  if (failures < 3) return 0
  return Math.min(30_000, 1000 * 2 ** (failures - 3))
}
