import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { STICKERS } from '../../content/stickers'
import { useI18n, useStrings } from '../../i18n'
import { shy } from '../../lib/hyphenate'
import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'
import { PageHeader } from '../../ui/PageHeader'
import { SymbolImg } from '../../ui/SymbolImg'
import { Tile } from '../../ui/Tile'
import { gameCount } from './counts'
import styles from './Games.module.css'
import { gameChips } from './meta'
import { useStickers } from './stickers'
import { GROUP_ORDER, GROUP_TITLES, GROUP_TITLES_ADULT, gamesFor } from './registry'
import { S } from './strings'

export function Hub() {
  const t = useStrings(S)
  const navigate = useNavigate()
  const board = useDevice((s) => s.boardMode)
  const uiLang = useDevice((s) => s.uiLang)
  const hy = uiLang === 'ru' ? 'ru' : 'uz'
  const { ui } = useI18n()
  const kind = useProfileStore((s) => s.profile.kind)
  const lang = useProfileStore((s) => s.profile.speechLang)
  const games = useMemo(() => gamesFor(kind), [kind])
  // Age and size labels: always computed from the data of this profile (kind and language), never typed.
  const chips = useMemo(() => new Map(games.map((g) => [g.id, gameChips(g, gameCount(g.id, kind, lang), kind, t)])), [games, kind, lang, t])
  const adult = kind === 'adult'
  const groupTitle = (g: (typeof GROUP_ORDER)[number]) => ui((adult ? GROUP_TITLES_ADULT : GROUP_TITLES)[g])
  const stickers = useStickers()
  const latest = stickers[0]?.stickerId
  return (
    <div className={styles.page} data-board={board || undefined}>
      <PageHeader title={adult ? t('titleAdult') : t('title')} back="/" symbol={<SymbolImg id="puzzle" />} />
      <div className={styles.hub} data-reach>
        {GROUP_ORDER.map((group) => {
          const list = games.filter((g) => g.group === group)
          if (!list.length) return null
          return (
            <section key={group} className={styles.hubSection} aria-label={groupTitle(group)}>
              {games.length > 4 && <h2 className={styles.hubGroup}>{groupTitle(group)}</h2>}
              <ul className={styles.hubGrid} role="list">
                {list.map((g) => {
                  const name = ui(adult && g.titleAdult ? g.titleAdult : g.title)
                  const c = chips.get(g.id)
                  return (
                    <li key={g.id}>
                      <Tile navigates
                        shape={adult ? 'card' : 'plate'}
                        tone={g.tone}
                        symbol={g.symbol}
                        title={shy(name, hy)}
                        label={c ? `${name}, ${c.text}` : name}
                        onActivate={() => navigate(g.id)}
                      />
                      {c && (
                        <p className={styles.hubChips} data-testid={`chips-${g.id}`} aria-hidden="true">
                          {c.age && <span className={styles.chip}>{c.age}</span>}
                          <span className={styles.chip}>{c.count}</span>
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {kind === 'child' && <div className={styles.albumEntry}>
          <Tile navigates
            shape="card"
            tone="warm"
            symbol={latest ? stickerSymbol(latest) : 'glowing_star'}
            title={t('album')}
            subtitle={t('albumCount', { n: stickers.length })}
            label={`${t('album')}, ${t('albumCount', { n: stickers.length })}`}
            onActivate={() => navigate('stickers')}
            className={styles.albumTile}
          />
        </div>}
      </div>
    </div>
  )
}

function stickerSymbol(id: string): string {
  return STICKERS.find((s) => s.id === id)?.symbol ?? 'glowing_star'
}
