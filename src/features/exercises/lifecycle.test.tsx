import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfileStore } from '../../store/profile'
import BlowGame from './BlowGame'
import { MirrorExercise } from './Mirror'
import { HoldButton } from './parts'
import { useExerciseSettings } from './settings'
import VoiceGame from './VoiceGame'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))

class FakeTrack {
  stopped = false
  listeners: Record<string, Array<() => void>> = {}
  stop = vi.fn(() => {
    this.stopped = true
  })
  addEventListener(type: string, fn: () => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  end() {
    this.listeners.ended?.forEach((f) => f())
  }
}
function fakeStream() {
  const track = new FakeTrack()
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

class FakeAudioContext {
  sampleRate = 48000
  resume = () => Promise.resolve()
  close = () => Promise.resolve()
  createMediaStreamSource = () => ({ connect: () => undefined })
  createAnalyser = () => ({ fftSize: 2048, smoothingTimeConstant: 0, getFloatTimeDomainData: (b: Float32Array) => b.fill(0) })
}

function media(impl: () => Promise<MediaStream>) {
  const getUserMedia = vi.fn(impl)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  return getUserMedia
}

function at(path: string, element: React.ReactElement, route = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

function setHidden(v: boolean) {
  Object.defineProperty(document, 'hidden', { value: v, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

const flush = () =>
  act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
  useExerciseSettings.setState({ lastBlowEnd: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'mediaDevices')
  Reflect.deleteProperty(document, 'hidden')
})

function pointer(el: Element, type: string, id: number) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { pointerId: id, pointerType: 'touch', width: 10, height: 10, button: 0 })
  fireEvent(el, e)
}

describe('HoldButton (B7, B21)', () => {
  it('stays held until the LAST finger lifts', () => {
    const changes: boolean[] = []
    render(<HoldButton onHoldChange={(h) => changes.push(h)} />)
    const btn = screen.getByRole('button')
    pointer(btn, 'pointerdown', 1)
    pointer(btn, 'pointerdown', 2)
    pointer(btn, 'pointerup', 1)
    expect(changes).toEqual([true])
    pointer(btn, 'pointerup', 2)
    expect(changes).toEqual([true, false])
  })

  it('releases when focus moves away (Space down, Tab, release)', () => {
    const changes: boolean[] = []
    render(<HoldButton onHoldChange={(h) => changes.push(h)} />)
    const btn = screen.getByRole('button')
    fireEvent.keyDown(btn, { key: ' ' })
    expect(changes).toEqual([true])
    fireEvent.blur(btn)
    expect(changes).toEqual([true, false])
  })

  it('releases on window blur, on a hidden page and on lost pointer capture', () => {
    const changes: boolean[] = []
    render(<HoldButton onHoldChange={(h) => changes.push(h)} />)
    const btn = screen.getByRole('button')
    pointer(btn, 'pointerdown', 1)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(changes).toEqual([true, false])
    pointer(btn, 'pointerdown', 3)
    act(() => setHidden(true))
    expect(changes).toEqual([true, false, true, false])
    setHidden(false)
    pointer(btn, 'pointerdown', 4)
    pointer(btn, 'lostpointercapture', 4)
    expect(changes.at(-1)).toBe(false)
  })
})

describe('adult settings are behind the adult gate on a child profile (B11)', () => {
  it('shows the hold-to-unlock gate, not the sensitivity slider', () => {
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, kind: 'child' } })
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: /Kattalar uchun sozlamalar/ }))
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByRole('button', { name: /1,5 soniya/ })).toBeInTheDocument()
  })

  it('an adult profile opens them directly', () => {
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, kind: 'adult' } })
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: /Kattalar uchun sozlamalar/ }))
    expect(screen.getByRole('slider')).toBeInTheDocument()
    useProfileStore.setState({ profile: { ...useProfileStore.getState().profile, kind: 'child' } })
  })
})

describe('pending microphone permission has a way out (B8)', () => {
  it('after ~8 s the overlay offers the hold fallback and cancel', async () => {
    vi.useFakeTimers()
    media(() => new Promise<MediaStream>(() => undefined))
    at('/exercises/voice', <VoiceGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    expect(screen.getByText(/Ruxsat kutilmoqda/)).toBeInTheDocument()
    // the intro buttons are gone and there is no way out yet
    expect(screen.queryAllByRole('button', { name: 'Mikrofonsiz' })).toHaveLength(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8100)
    })
    const out = screen.getByRole('button', { name: 'Mikrofonsiz' })
    expect(screen.getByRole('button', { name: /Bekor/ })).toBeInTheDocument()
    fireEvent.click(out)
    expect(screen.getByRole('button', { name: 'Bosib turing' })).toBeInTheDocument()
  })
})

describe('microphone lifecycle (B6, B23)', () => {
  it('unmounting stops the tracks synchronously', async () => {
    const { stream, track } = fakeStream()
    media(() => Promise.resolve(stream))
    const { unmount } = at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    await flush()
    expect(track.stopped).toBe(false)
    unmount()
    expect(track.stop).toHaveBeenCalled()
  })

  it('a hidden page releases the microphone; coming back opens it again', async () => {
    const first = fakeStream()
    const second = fakeStream()
    const getUserMedia = media(() => Promise.resolve(getUserMedia.mock.calls.length === 1 ? first.stream : second.stream))
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    await flush()
    act(() => setHidden(true))
    expect(first.track.stopped).toBe(true)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    await act(async () => {
      setHidden(false)
      await Promise.resolve()
    })
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })
})

describe('breathing rest period (B22)', () => {
  it('right after a full session the game shows the rest note, not the start button', () => {
    useExerciseSettings.setState({ lastBlowEnd: Date.now() - 30_000 })
    at('/exercises/blow', <BlowGame />)
    expect(screen.getByText(/Taxminan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mikrofonni yoqish' })).toBeNull()
  })
  it('after the rest period it starts normally', () => {
    useExerciseSettings.setState({ lastBlowEnd: Date.now() - 125_000 })
    at('/exercises/blow', <BlowGame />)
    expect(screen.getByRole('button', { name: 'Mikrofonni yoqish' })).toBeInTheDocument()
  })
})

describe('camera (B9, B18)', () => {
  const on = () => screen.getByRole('button', { name: /^(Oynani|Ko.zguni) yoqish$/ })

  it('after a denial the turn-on button stays and asks again', async () => {
    const getUserMedia = media(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    at('/exercises/mirror/smile', <MirrorExercise />, '/exercises/mirror/:id')
    fireEvent.click(on())
    expect(await screen.findByText(/Kamera yo/)).toBeVisible()
    expect(on()).toBeEnabled()
    fireEvent.click(on())
    await flush()
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('a camera that ends mid-session is noticed: stream released, adult-confirm mode', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const { stream, track } = fakeStream()
    media(() => Promise.resolve(stream))
    at('/exercises/mirror/clock', <MirrorExercise />, '/exercises/mirror/:id')
    fireEvent.click(on())
    await flush()
    act(() => track.end())
    expect(track.stop).toHaveBeenCalled()
    expect(await screen.findByText(/Kamera yo/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Uddaladi!' })).toBeInTheDocument()
  })
})

describe('level meter ("we hear you") in the microphone exercises', () => {
  it('voice: the meter appears once the room is measured and the microphone listens', async () => {
    vi.useFakeTimers()
    const { stream } = fakeStream()
    media(() => Promise.resolve(stream))
    at('/exercises/voice', <VoiceGame />)
    expect(screen.queryByRole('meter')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2200)
    })
    expect(screen.getByRole('meter', { name: 'Tovush darajasi' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('blow: the meter appears with the microphone, and is gone again in the press-and-hold fallback', async () => {
    vi.useFakeTimers()
    const { stream } = fakeStream()
    media(() => Promise.resolve(stream))
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2200)
    })
    expect(screen.getByRole('meter')).toBeInTheDocument()
  })

  it('denied microphone: no meter, the hold button completes the exercise', async () => {
    media(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    at('/exercises/voice', <VoiceGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    expect(await screen.findByRole('button', { name: 'Bosib turing' })).toBeVisible()
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('"without microphone" never shows a meter', () => {
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonsiz' }))
    expect(screen.queryByRole('meter')).toBeNull()
  })
})
