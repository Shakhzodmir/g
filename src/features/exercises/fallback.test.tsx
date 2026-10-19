import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BlowGame from './BlowGame'
import { MirrorExercise } from './Mirror'
import { MIC_CONSTRAINTS } from './sensors/useMic'
import VoiceGame from './VoiceGame'

vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }))

function denyMedia() {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  return getUserMedia
}

beforeEach(() => {
  // jsdom has no Web Audio; the hook only needs the constructor to exist before asking for the mic.
  vi.stubGlobal('AudioContext', class {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

function at(path: string, element: React.ReactElement, route = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('microphone denied → press-and-hold fallback', () => {
  it('blow: shows the hold button and the no-mic note after NotAllowedError', async () => {
    const getUserMedia = denyMedia()
    at('/exercises/blow', <BlowGame />)
    expect(screen.queryByRole('button', { name: 'Bosib turing' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    expect(await screen.findByRole('button', { name: 'Bosib turing' })).toBeVisible()
    expect(screen.getByText(/Mikrofon ishlamayapti/)).toBeVisible()
    expect(getUserMedia).toHaveBeenCalledWith(MIC_CONSTRAINTS)
    const audio = (getUserMedia.mock.calls[0][0] as MediaStreamConstraints).audio as MediaTrackConstraints
    expect(audio).toMatchObject({ echoCancellation: false, noiseSuppression: false, autoGainControl: false })
  })

  it('voice: shows the hold button after NotAllowedError', async () => {
    denyMedia()
    at('/exercises/voice', <VoiceGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonni yoqish' }))
    expect(await screen.findByRole('button', { name: 'Bosib turing' })).toBeVisible()
  })

  it('blow: "without microphone" goes straight to the hold button', () => {
    const getUserMedia = denyMedia()
    at('/exercises/blow', <BlowGame />)
    fireEvent.click(screen.getByRole('button', { name: 'Mikrofonsiz' }))
    expect(screen.getByRole('button', { name: 'Bosib turing' })).toBeVisible()
    expect(getUserMedia).not.toHaveBeenCalled()
  })
})

describe('camera denied → model-only mode', () => {
  it('mirror: shows the no-camera note and keeps the adult "Uddaladi!" button', async () => {
    denyMedia()
    at('/exercises/mirror/smile', <MirrorExercise />, '/exercises/mirror/:id')
    fireEvent.click(screen.getByRole('button', { name: /^(Oynani|Ko.zguni) yoqish$/ }))
    expect(await screen.findByText(/Kamera yoʻq|Kamera yo‘q/)).toBeVisible()
    const got = screen.getByRole('button', { name: 'Uddaladi!' })
    fireEvent.click(got)
    expect(screen.getByLabelText(/Takrorlar: 1 \/ 5/)).toBeInTheDocument()
  })
})
