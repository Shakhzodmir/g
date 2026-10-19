import { speak, speakSequence, speechGeneration, stopSpeakingIfUnchanged, type SpeakItem } from '../../audio/speech'

/** Generation of the last speech the communicator started (see speechGeneration). */
let last = -1

/** Speaks one item for the communicator and remembers that it did. */
export function aacSpeak(item: SpeakItem): void {
  void speak(item)
  last = speechGeneration()
}

/** Speaks a sentence for the communicator; resolves when it ends or is interrupted. */
export function aacSpeakSequence(items: SpeakItem[]): Promise<void> {
  const p = speakSequence(items)
  last = speechGeneration()
  return p
}

/** Called when the communicator is left: stops its own speech, not one started by someone else meanwhile. */
export function stopAacSpeech(): void {
  if (last >= 0) stopSpeakingIfUnchanged(last)
}
