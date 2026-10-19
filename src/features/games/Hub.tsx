import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { STICKERS } from '../../content/stickers'
import { useStrings } from '../../i18n'
import { db } from '../../store/db'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import styles from './Games.module.css'
import { S } from './strings'

const GAMES = [
  { id: 'animals', path: 'animals', symbol: 'cow', tone: 'warm' },
  { id: 'find', path: 'find', symbol: 'magnifying_glass_tilted_left', tone: 'primary' },
  { id: 'memory', path: 'memory', symbol: 'puzzle_piece', tone: 'secondary' },
  { id: 'syllables', path: 'syllables', symbol: 'drum', tone: 'calm' },
] as const

/** Stickers of one profile, newest first (empty while loading or without IndexedDB). */
export function useStickers(): Array<{ stickerId: string; ts: number }> {
  const profileId = useProfileStore((s) => s.profile.id)
  return (
    useLiveQuery(
      async () => {
        try {
          return (await db.stickers.where('profileId').equals(profileId).toArray()).sort((a, b) => b.ts - a.ts)
        } catch {
          return []
        }
      },
      [profileId],
    ) ?? []
  )
}

export function Hub() {
  const t = useStrings(S)
  const navigate = useNavigate()
  const board = useDevice((s) => s.boardMode)
  const stickers = useStickers()
  const latest = stickers[0]?.stickerId
  return (
    <div className={styles.page} data-board={board || undefined}>
      <div className={styles.head}>
        <PageHeader title={t('title')} back="/" symbol={<SymbolImg id="puzzle" />} />
      </div>
      <div className={styles.hub}>
        <ul className={styles.hubGrid} role="list">
          {GAMES.map((g) => (
            <li key={g.id}>
              <Tile shape="plate" tone={g.tone} symbol={g.symbol} title={t(g.id)} label={t(g.id)} onActivate={() => navigate(g.path)} />
            </li>
          ))}
        </ul>
        <div className={styles.albumEntry}>
          <Tile
            shape="card"
            tone="warm"
            symbol={latest ? stickerSymbol(latest) : 'glowing_star'}
            title={t('album')}
            subtitle={t('albumCount', { n: stickers.length })}
            label={`${t('album')}, ${t('albumCount', { n: stickers.length })}`}
            onActivate={() => navigate('stickers')}
            className={styles.albumTile}
          />
        </div>
      </div>
    </div>
  )
}

function stickerSymbol(id: string): string {
  return STICKERS.find((s) => s.id === id)?.symbol ?? 'glowing_star'
}
