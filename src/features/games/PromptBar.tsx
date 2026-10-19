import { Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMotionPreset } from '../../design/motion'
import { Button } from '../../ui/Button'
import { Musicha } from '../../ui/mascot/Musicha'
import { useSpeechLevel } from '../../ui/useSpeechLevel'
import styles from './Games.module.css'

/** Musicha asks the question; the text is secondary, the button repeats the voice. */
export function PromptBar({ text, listenLabel, onListen, children }: { text: string; listenLabel: string; onListen: () => void; children?: ReactNode }) {
  const level = useSpeechLevel()
  const preset = useMotionPreset()
  return (
    <div className={styles.prompt}>
      <span className={styles.promptMascot} aria-hidden="true">
        <Musicha state={level > 0.02 ? 'speak' : 'idle'} level={level} size={72} calm={!preset.idleLoops} title="" />
      </span>
      <p className={styles.promptText} aria-live="polite">
        {text}
      </p>
      {children}
      <Button variant="soft" size="lg" iconOnly icon={<Volume2 />} label={listenLabel} onActivate={onListen}>
        {listenLabel}
      </Button>
    </div>
  )
}
