import { useNavigate } from 'react-router'
import { useStrings } from '../i18n'
import { BOARD_X } from '../features/board/strings'
import { useDevice } from '../store/device'
import { Button } from '../ui/Button'
import styles from './BoardPreviewBar.module.css'

/** Shown while the board setup page previews its draft: save it, or go back to the form (nothing was stored). */
export function BoardPreviewBar() {
  const t = useStrings(BOARD_X)
  const navigate = useNavigate()
  const commit = useDevice((s) => s.commitBoardPreview)
  const cancel = useDevice((s) => s.cancelBoardPreview)
  return (
    <div className={styles.bar} role="region" aria-label={t('previewBtn')} data-no-print>
      <p className={styles.text}>{t('previewBar')}</p>
      <Button onActivate={commit}>{t('previewSave')}</Button>
      <Button
        variant="soft"
        onActivate={() => {
          cancel()
          navigate('/board-setup')
        }}
      >
        {t('previewBack')}
      </Button>
    </div>
  )
}
