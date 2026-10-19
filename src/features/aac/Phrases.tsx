import { useMemo, useState, type CSSProperties } from 'react'
import { PHRASES } from '../../content/phrases'
import { useLabel, useStrings } from '../../i18n'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './Aac.module.css'
import { phraseEntry, type OnTap } from './entry'
import { S } from './strings'

const PAIN_IDS = new Set(Array.from({ length: 11 }, (_, i) => `pain_${i}`))

/** Quick phrases for the profile's audience (children: kid/both; adults: adult/both), pain scale excluded. */
export function PhrasesPanel({ adult, onTap, glowKey }: { adult: boolean; onTap: OnTap; glowKey: string | null }) {
  const label = useLabel()
  const list = useMemo(
    () => PHRASES.filter((p) => !PAIN_IDS.has(p.id) && (p.audience === 'both' || p.audience === (adult ? 'adult' : 'kid'))),
    [adult],
  )
  return (
    <div className={styles.phraseGrid} role="group">
      {list.map((p, i) => {
        const e = phraseEntry(p)
        return (
          <Pressable
            key={p.id}
            className={styles.phrase}
            label={label(e.text)}
            scanGroup={`prow-${Math.floor(i / 2)}`}
            data-glow={glowKey === e.key ? 'true' : undefined}
            onActivate={() => onTap(e)}
          >
            <span className={styles.phraseSymbol} aria-hidden="true">
              <SymbolImg id={p.symbol} />
            </span>
            <span className={styles.phraseText}>{label(e.text)}</span>
          </Pressable>
        )
      })}
    </div>
  )
}

/** Pain scale 0–10: one tap says the whole sentence ("Pain: 7 of 10. Strong"). Calm colours, never red. */
export function PainPanel({ onTap, glowKey }: { onTap: OnTap; glowKey: string | null }) {
  const t = useStrings(S)
  const label = useLabel()
  const [chosen, setChosen] = useState<number | null>(null)
  const pains = useMemo(() => Array.from({ length: 11 }, (_, n) => PHRASES.find((p) => p.id === `pain_${n}`)!), [])
  const here = PHRASES.find((p) => p.id === 'hurts_here')
  const chosenPhrase = chosen === null ? null : pains[chosen]
  return (
    <div className={styles.pain}>
      <h2 className={styles.painTitle}>{t('painTitle')}</h2>
      <div className={styles.painScale} role="group" aria-label={t('painTitle')}>
        {pains.map((p, n) => {
          const e = phraseEntry(p)
          return (
            <Pressable
              key={p.id}
              className={styles.painBtn}
              label={label(e.text)}
              scanGroup={n < 6 ? 'pain-a' : 'pain-b'}
              pressed={chosen === n}
              style={{ '--n': n } as CSSProperties}
              data-glow={glowKey === e.key ? 'true' : undefined}
              onActivate={() => {
                setChosen(n)
                onTap(e)
              }}
            >
              {n}
            </Pressable>
          )
        })}
      </div>
      <div className={styles.painLegend} aria-hidden="true">
        <span>0 · {t('painNone')}</span>
        <span>10 · {t('painWorst')}</span>
      </div>
      <p className={styles.painChosen} aria-live="polite">
        {chosenPhrase ? label(chosenPhrase) : ' '}
      </p>
      {here && (
        <Pressable
          className={styles.phrase}
          label={label(here)}
          scanGroup="pain-here"
          data-glow={glowKey === `p.${here.id}` ? 'true' : undefined}
          onActivate={() => onTap(phraseEntry(here))}
        >
          <span className={styles.phraseSymbol} aria-hidden="true">
            <SymbolImg id={here.symbol} />
          </span>
          <span className={styles.phraseText}>{label(here)}</span>
        </Pressable>
      )}
    </div>
  )
}
