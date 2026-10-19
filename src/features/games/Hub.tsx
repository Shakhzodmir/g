import { useNavigate } from 'react-router'
import { STICKERS } from '../../content/stickers'
import { useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useDevice } from '../../store/device'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import styles from './Games.module.css'
import { useStickers } from './stickers'
import { S } from './strings'

const GAMES = [
  { id: 'animals', path: 'animals', symbol: 'cow', tone: 'warm' },
  { id: 'find', path: 'find', symbol: 'magnifying_glass_tilted_left', tone: 'primary' },
  { id: 'memory', path: 'memory', symbol: 'puzzle_piece', tone: 'secondary' },
  { id: 'syllables', path: 'syllables', symbol: 'drum', tone: 'calm' },
] as const

export function Hub() {
  const t = useStrings(S)
  const navigate = useNavigate()
  const board = useDevice((s) => s.boardMode)
  const uiLang = useDevice((s) => s.uiLang)
  const hy = uiLang === 'ru' ? 'ru' : 'uz'
  const stickers = useStickers()
  const latest = stickers[0]?.stickerId
  return (
    <div className={styles.page} data-board={board || undefined}>
      <PageHeader title={t('title')} back="/" symbol={<SymbolImg id="puzzle" />} />
      <div className={styles.hub} data-reach>
        <ul className={styles.hubGrid} role="list">
          {GAMES.map((g) => (
            <li key={g.id}>
              <Tile shape="plate" tone={g.tone} symbol={g.symbol} title={shy(t(g.id), hy)} label={t(g.id)} onActivate={() => navigate(g.path)} />
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
