import { useEffect, useState } from 'react'
import { onSpeechLevel } from '../audio/speech'

/** Live 0..1 loudness of whatever the app is currently saying (drives the mascot's beak). */
export function useSpeechLevel(): number {
  const [level, setLevel] = useState(0)
  useEffect(() => onSpeechLevel((l) => setLevel((prev) => (Math.abs(prev - l) > 0.04 || l === 0 ? l : prev))), [])
  return level
}
