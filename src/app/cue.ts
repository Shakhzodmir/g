import { useDevice } from '../store/device'
import { getProfile } from '../store/profile'

/**
 * Soft spoken cue for switch scanning (profile.scanning.audioCue): reads the highlighted item's name with the
 * system voice. Uses speechSynthesis directly so the on-screen "unspoken" overlay never pops up for cues;
 * silently does nothing when no speech engine exists.
 */
export function speakScanCue(label: string): void {
  const p = getProfile()
  if (!p.scanning.audioCue) return
  const synth = globalThis.speechSynthesis
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return
  try {
    const ru = useDevice.getState().uiLang === 'ru'
    const u = new SpeechSynthesisUtterance(label)
    u.lang = ru ? 'ru-RU' : 'uz-UZ'
    u.rate = Math.min(1.4, Math.max(0.6, p.voice.rate))
    u.volume = Math.min(0.8, Math.max(0.2, p.voice.volume * 0.7))
    synth.cancel()
    synth.speak(u)
  } catch {
    /* no engine: stay quiet */
  }
}
