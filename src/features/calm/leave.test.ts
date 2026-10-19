import { describe, expect, it } from 'vitest'
import { calmExit } from './leave'

describe('leaving the calm corner', () => {
  it('goes one step back when there is history (keeps the place, no /calm loop)', () => {
    expect(calmExit({ idx: 2 })).toEqual({ kind: 'back' })
    expect(calmExit({ idx: 1, from: '/talk' })).toEqual({ kind: 'back' })
  })

  it('without history uses the remembered place, else Home', () => {
    expect(calmExit({ idx: 0, from: '/games/find' })).toEqual({ kind: 'to', path: '/games/find' })
    expect(calmExit({ idx: undefined })).toEqual({ kind: 'to', path: '/' })
    expect(calmExit({ idx: 0, from: '/calm' })).toEqual({ kind: 'to', path: '/' })
    expect(calmExit({ idx: 0, from: '//evil.example' })).toEqual({ kind: 'to', path: '/' })
    expect(calmExit({ idx: 0, from: 42 })).toEqual({ kind: 'to', path: '/' })
  })
})
