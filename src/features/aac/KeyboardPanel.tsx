import { Delete, Space, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { speak } from '../../audio/speech'
import { wordById, WORDS } from '../../content/vocab'
import { useLabel, useStrings } from '../../i18n'
import { normalizeUz } from '../../i18n/orthography'
import { useDevice } from '../../store/device'
import { logEvent, queryEvents } from '../../store/events'
import { useProfile } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Pressable } from '../../ui/Pressable'
import styles from './Aac.module.css'
import { layoutFor, LAYOUTS, uzCyrlToLatn } from './keyboard'
import { applyPrediction, predict } from './predict'
import { S } from './strings'

const HISTORY_DAYS = 180

/** Personal words from the usage log: tapped words and sentences typed before. */
function useHistoryWords(profileId: string, label: (bi: { uz: string; ru: string }) => string, refresh: number): string[] {
  const [words, setWords] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    void queryEvents(profileId, Date.now() - HISTORY_DAYS * 86_400_000).then((rows) => {
      if (!alive) return
      const out: string[] = []
      for (const r of rows) {
        if (r.type === 'aac_word') {
          const w = wordById(r.ref)
          if (w) out.push(label(w))
        } else if (r.type === 'aac_speak' && r.ref === 'kb' && typeof r.meta?.text === 'string') {
          out.push(r.meta.text)
        }
      }
      setWords(out)
    })
    return () => {
      alive = false
    }
  }, [profileId, label, refresh])
  return words
}

/** Text keyboard for adults and readers: uz Latin / uz Cyrillic / Russian keys, word prediction, "Say". */
export function KeyboardPanel() {
  const t = useStrings(S)
  const label = useLabel()
  const profile = useProfile()
  const uzScript = useDevice((s) => s.uzScript)
  const layout = LAYOUTS[layoutFor(profile.speechLang, uzScript)]
  const [text, setText] = useState('')
  const [spoken, setSpoken] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const history = useHistoryWords(profile.id, label, spoken)
  const vocab = useMemo(() => WORDS.map((w) => label(w)), [label])
  const suggestions = useMemo(() => predict({ text, vocab, history, limit: 4 }), [text, vocab, history])

  const type = (s: string) => setText((v) => v + s)
  const say = () => {
    const typed = text.trim()
    if (!typed) return
    const uz = layout.id === 'uz-cyrl' ? uzCyrlToLatn(typed) : normalizeUz(typed)
    void speak({ key: 'kb', text: { uz, ru: typed } })
    logEvent('aac_speak', 'kb', { text: typed })
    setSpoken((n) => n + 1)
  }

  return (
    <div className={styles.kb}>
      <div className={styles.kbTop}>
        <input
          ref={input}
          className={styles.kbInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              say()
            }
          }}
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          lang={profile.speechLang === 'ru' ? 'ru' : uzScript === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn'}
          placeholder={t('typeHere')}
          aria-label={t('typeHere')}
        />
        <Button variant="primary" size="lg" icon={<Volume2 />} label={t('say')} scanGroup="kb-say" className={styles.kbSay} onActivate={say} disabled={!text.trim()}>
          {t('say')}
        </Button>
      </div>

      <div className={styles.kbSuggest} role="group" aria-label={t('suggestions')}>
        {Array.from({ length: 4 }, (_, i) => {
          const w = suggestions[i]
          return w ? (
            <Button key={`s-${i}`} variant="soft" scanGroup="kb-suggest" label={w} onActivate={() => setText((v) => applyPrediction(v, w))}>
              {w}
            </Button>
          ) : (
            <span key={`s-${i}`} className={styles.kbSuggestEmpty} aria-hidden="true" />
          )
        })}
      </div>

      <div className={styles.kbKeys} role="group" aria-label={t('keys')} data-layout={layout.id}>
        {layout.rows.map((row, r) => (
          <div key={r} className={styles.kbRow} style={{ '--n': row.length } as CSSProperties}>
            {row.map((k) => (
              <Pressable key={k.insert} className={styles.key} label={k.label} scanGroup={`kb-${r}`} onActivate={() => type(k.insert)}>
                {k.label}
              </Pressable>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.kbActions}>
        <Button variant="soft" size="lg" icon={<Space />} label={t('space')} scanGroup="kb-act" className={styles.kbSpace} onActivate={() => type(' ')}>
          {t('space')}
        </Button>
        <Button variant="soft" size="lg" iconOnly icon={<Delete />} label={t('deleteLetter')} scanGroup="kb-act" onActivate={() => setText((v) => Array.from(v).slice(0, -1).join(''))}>
          {t('deleteLetter')}
        </Button>
        <Button variant="soft" size="lg" iconOnly icon={<X />} label={t('clearText')} scanGroup="kb-act" onActivate={() => setText('')}>
          {t('clearText')}
        </Button>
      </div>
    </div>
  )
}
