import { useNavigate } from 'react-router'
import { useStrings } from '../i18n'
import { useDevice } from '../store/device'
import { Button } from '../ui/Button'
import { Card } from '../ui/misc'
import { useMediaQuery } from '../lib/useMediaQuery'
import styles from './Home.module.css'
import { SHELL } from './strings'

/** Width alone cannot tell a 24" monitor from an 86" board, so board mode is a suggestion, never automatic. */
export function BoardHint() {
  const t = useStrings(SHELL)
  const navigate = useNavigate()
  const board = useDevice((s) => s.boardMode)
  const dismissed = useDevice((s) => s.boardHintDismissed)
  const dismiss = useDevice((s) => s.dismissBoardHint)
  const likelyBoard = useMediaQuery('(pointer: coarse) and (any-hover: none) and (min-width: 1200px)')
  if (board || dismissed || !likelyBoard) return null
  return (
    <Card>
      <p className={styles.hintText}>{t('boardHint')}</p>
      <div className={styles.hintActions}>
        <Button onActivate={() => navigate('/board-setup')}>{t('boardHintOn')}</Button>
        <Button variant="ghost" onActivate={dismiss}>
          {t('boardHintLater')}
        </Button>
      </div>
    </Card>
  )
}
