import { useLabel, useStrings } from '../../i18n'
import { symbolUrl } from '../../ui/SymbolImg'
import type { CardView } from './cards'
import styles from './PrintSheet.module.css'
import { S } from './strings'

/** Print-only version of the current schedule: plain cards in a clean grid (hidden on screen). */
export function PrintSheet({ title, cards, kind }: { title: string; cards: Array<CardView | null>; kind: 'first-then' | 'day' }) {
  const t = useStrings(S)
  const label = useLabel()
  const list = cards.filter((c): c is CardView => !!c)
  return (
    <div className={styles.sheet} aria-hidden="true">
      <h2 className={styles.title}>{title}</h2>
      <ol className={kind === 'first-then' ? styles.pair : styles.grid}>
        {list.map((c, i) => (
          <li key={`${c.ref}-${i}`} className={styles.card}>
            <span className={styles.step}>{kind === 'first-then' ? (i === 0 ? t('first') : t('then')) : i + 1}</span>
            <img className={styles.img} src={c.photo ?? symbolUrl(c.symbol)} alt="" />
            <span className={styles.name}>{label(c.label)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
