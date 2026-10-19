import { speak } from '../../audio/speech'
import { STICKERS } from '../../content/stickers'
import { useLabel, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { EmptyState } from '../../ui/misc'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Games.module.css'
import { useStickers } from './Hub'
import { S } from './strings'

/** Sticker album: what the child collected. Empty places are quiet outlines, never a "missing" count. */
export function Album() {
  const t = useStrings(S)
  const label = useLabel()
  const board = useDevice((s) => s.boardMode)
  const hy = useProfileStore((s) => s.profile.speechLang) === 'ru' ? 'ru' : 'uz'
  const rows = useStickers()
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.stickerId, (counts.get(r.stickerId) ?? 0) + 1)

  return (
    <div className={styles.page} data-board={board || undefined}>
      <PageHeader title={t('album')} back="/games" />
      {rows.length === 0 ? (
        <EmptyState symbol="glowing_star" title={t('albumEmpty')} />
      ) : (
        <ul className={styles.album} role="list">
          {[...STICKERS.filter((s) => counts.has(s.id)), ...STICKERS.filter((s) => !counts.has(s.id))].map((s) => {
            const n = counts.get(s.id) ?? 0
            const name = label(s)
            return (
              <li key={s.id}>
                {n > 0 ? (
                  <Pressable className={styles.sticker} label={name} onActivate={() => void speak({ key: `sticker.${s.id}`, text: { uz: s.uz, ru: s.ru } })}>
                    <span className={styles.stickerPic} aria-hidden="true">
                      <SymbolImg id={s.symbol} />
                    </span>
                    <span className={styles.stickerName}>{shy(name, hy)}</span>
                    {n > 1 && <span className={styles.stickerCount}>×{n}</span>}
                  </Pressable>
                ) : (
                  <span className={styles.stickerSlot} role="img" aria-label={t('stickerSlot')} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
