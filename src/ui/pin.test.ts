import { describe, expect, it } from 'vitest'
import { hashPin, pinLockMs, verifyPin } from './pin'

async function legacyHash(pin: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`gapimiz:${pin}`))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('PIN hashing', () => {
  it('stores a salted hash that verifies only the right PIN', async () => {
    const h = await hashPin('1234')
    expect(h.startsWith('v2$')).toBe(true)
    expect((await verifyPin('1234', h)).ok).toBe(true)
    expect((await verifyPin('1235', h)).ok).toBe(false)
    expect((await verifyPin('1234', h)).upgrade).toBe(false)
  })

  it('uses a fresh salt every time', async () => {
    expect(await hashPin('1234')).not.toBe(await hashPin('1234'))
  })

  it('still accepts the old unsalted hash once and asks for an upgrade', async () => {
    const old = await legacyHash('4321')
    expect(await verifyPin('4321', old)).toEqual({ ok: true, upgrade: true })
    expect((await verifyPin('0000', old)).ok).toBe(false)
  })

  it('locks out 1 s, 2 s, 4 s … up to 30 s after the third failure', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(pinLockMs)).toEqual([0, 0, 1000, 2000, 4000, 8000, 30000])
  })
})
