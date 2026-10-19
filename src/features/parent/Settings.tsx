import { Check, MonitorSmartphone, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { speak } from '../../audio/speech'
import { wordById } from '../../content/vocab'
import { COMMON } from '../../i18n/common'
import { useStrings, type SpeechLang, type UiLang, type UzScript } from '../../i18n'
import { useDevice } from '../../store/device'
import { useProfileStore, type ScanMode, type Sensory, type ThemeId } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented, Slider, Toggle } from '../../ui/controls'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { hashPin } from '../../ui/ParentGate'
import { Pressable } from '../../ui/Pressable'
import styles from './parent.module.css'
import { Section, useProfileTitle, useT, useTk } from './shared'

const THEMES: ThemeId[] = ['bolajon', 'tun', 'tinch', 'kattalar', 'hc-light', 'hc-dark']

/** Static preview colours (mirrors src/design/tokens.css) — a nested element cannot switch the html-level theme. */
const THEME_PREVIEW: Record<ThemeId, { bg: string; surface: string; text: string; primary: string }> = {
  bolajon: { bg: '#f4f8f7', surface: '#ffffff', text: '#1e2633', primary: '#0a7584' },
  tun: { bg: '#0e1726', surface: '#16233a', text: '#edf2f7', primary: '#4fd1db' },
  tinch: { bg: '#f1f3f2', surface: '#fbfbfa', text: '#283140', primary: '#3c7a82' },
  kattalar: { bg: '#f6f7f6', surface: '#ffffff', text: '#1f2328', primary: '#0a7584' },
  'hc-light': { bg: '#ffffff', surface: '#ffffff', text: '#000000', primary: '#00205b' },
  'hc-dark': { bg: '#000000', surface: '#000000', text: '#ffffff', primary: '#00e5ff' },
}

function ThemePicker() {
  const t = useT()
  const tk = useTk()
  const theme = useProfileStore((s) => s.profile.theme)
  const update = useProfileStore((s) => s.update)
  return (
    <div className={styles.field} role="group" aria-label={t('theme')}>
      <span className={styles.fieldLabel}>{t('theme')}</span>
      <div className={styles.themeGrid}>
        {THEMES.map((id) => {
          const c = THEME_PREVIEW[id]
          return (
            <Pressable key={id} className={styles.themeChip} label={tk(`theme_${id}`)} pressed={theme === id} onActivate={() => void update({ theme: id })}>
              <span className={styles.swatch} aria-hidden="true">
                <span style={{ background: c.bg }} />
                <span style={{ background: c.primary }} />
                <span className={styles.swatchText} style={{ color: c.text }}>
                  <span className={styles.swatchAa} style={{ background: c.surface }}>
                    Aa
                  </span>
                </span>
              </span>
              <span className={styles.themeLabel}>
                {theme === id && <Check aria-hidden="true" size={16} />}
                {tk(`theme_${id}`)}
              </span>
            </Pressable>
          )
        })}
      </div>
    </div>
  )
}

function PinSettings() {
  const t = useT()
  const pinHash = useDevice((s) => s.parentPinHash)
  const setPinHash = useDevice((s) => s.setParentPinHash)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [msg, setMsg] = useState<'mismatch' | 'saved' | 'cleared' | null>(null)
  const valid = /^\d{4,6}$/.test(a)

  const save = async () => {
    if (!valid) return
    if (a !== b) {
      setMsg('mismatch')
      return
    }
    setPinHash(await hashPin(a))
    setA('')
    setB('')
    setMsg('saved')
  }

  return (
    <Section title={t('pinSection')}>
      <p className={styles.hint}>{t('pinHint')}</p>
      <p>
        <strong>{pinHash ? t('pinIsSet') : t('pinNotSet')}</strong>
      </p>
      <form
        className={styles.pinRow}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('pinNew')}</span>
          <input className={styles.input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={a} onChange={(e) => (setA(e.target.value.replace(/\D/g, '')), setMsg(null))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('pinRepeat')}</span>
          <input className={styles.input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={b} onChange={(e) => (setB(e.target.value.replace(/\D/g, '')), setMsg(null))} />
        </label>
        <Button onActivate={() => void save()} disabled={!valid || b.length < 4}>
          {t('pinSave')}
        </Button>
      </form>
      {pinHash && (
        <div className={styles.row}>
          <Button
            variant="ghost"
            onActivate={() => {
              setPinHash(null)
              setMsg('cleared')
            }}
          >
            {t('pinClear')}
          </Button>
        </div>
      )}
      {msg && (
        <p className={msg === 'mismatch' ? styles.notice : styles.status} role="status">
          {msg === 'mismatch' ? t('pinMismatch') : msg === 'saved' ? t('pinSaved') : t('pinCleared')}
        </p>
      )}
    </Section>
  )
}

export default function Settings() {
  const t = useT()
  const tk = useTk()
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const name = useProfileTitle()
  const p = useProfileStore((s) => s.profile)
  const update = useProfileStore((s) => s.update)
  const uiLang = useDevice((s) => s.uiLang)
  const uzScript = useDevice((s) => s.uzScript)
  const setUiLang = useDevice((s) => s.setUiLang)
  const setUzScript = useDevice((s) => s.setUzScript)
  const boardMode = useDevice((s) => s.boardMode)
  const ms = (v: number) => (v === 0 ? t('off') : v >= 1000 ? t('sec', { n: String(v / 1000) }) : t('ms', { n: v }))
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const labelsValue = !p.aac.showLabels ? 'off' : p.aac.labelPos
  const sample = wordById('water')

  return (
    <>
      <PageHeader title={t('secSettings')} back="/parent" />
      <Page width="narrow">
        <Section title={t('deviceSection')}>
          <p className={styles.hint}>{t('deviceNote')}</p>
          <Segmented<UiLang>
            label={t('uiLang')}
            value={uiLang}
            onChange={setUiLang}
            wrap
            options={[
              { value: 'uz', label: 'Oʻzbekcha' },
              { value: 'uzc', label: 'Ўзбекча' },
              { value: 'ru', label: 'Русский' },
            ]}
          />
          <Segmented<UzScript>
            label={t('uzScript')}
            value={uzScript}
            onChange={setUzScript}
            wrap
            options={[
              { value: 'latn', label: t('scriptLatn') },
              { value: 'cyrl', label: t('scriptCyrl') },
              { value: 'latn2026', label: t('scriptLatn2026') },
            ]}
          />
          <p className={styles.hint}>{t('scriptHint')}</p>
        </Section>

        <Section title={t('profileSection', { name })}>
          <Segmented<SpeechLang>
            label={t('speechLang')}
            value={p.speechLang}
            onChange={(v) => void update({ speechLang: v })}
            options={[
              { value: 'uz', label: t('langUz') },
              { value: 'ru', label: t('langRu') },
            ]}
          />
          <ThemePicker />
          <Segmented<Sensory>
            label={t('sensory')}
            value={p.sensory}
            onChange={(v) => void update({ sensory: v })}
            wrap
            options={(['calm', 'normal', 'festive'] as const).map((v) => ({ value: v, label: tk(`sensory_${v}`) }))}
          />
          <p className={styles.hint}>{t('sensoryHint')}</p>
        </Section>

        <Section title={t('touchSection')}>
          <Toggle label={t('activateOnRelease')} hint={t('aorHint')} checked={p.touch.activateOnRelease} onChange={(v) => void update({ touch: { activateOnRelease: v } })} />
          <Slider label={t('holdMs')} hint={t('holdHint')} value={p.touch.holdMs} min={0} max={1500} step={100} format={ms} onChange={(v) => void update({ touch: { holdMs: v } })} />
          <Slider label={t('ignoreRepeat')} hint={t('ignoreRepeatHint')} value={p.touch.ignoreRepeatMs} min={0} max={2000} step={100} format={ms} onChange={(v) => void update({ touch: { ignoreRepeatMs: v } })} />
          <Slider label={t('dwell')} hint={t('dwellHint')} value={p.touch.dwellMs} min={0} max={2000} step={250} format={ms} onChange={(v) => void update({ touch: { dwellMs: v } })} />
        </Section>

        <Section title={t('scanSection')}>
          <Segmented<ScanMode>
            label={t('scanMode')}
            value={p.scanning.mode}
            onChange={(v) => void update({ scanning: { mode: v } })}
            wrap
            options={(['off', 'auto1', 'step2'] as const).map((v) => ({ value: v, label: tk(`scan_${v}`) }))}
          />
          <p className={styles.hint}>{t('scanHint')}</p>
          {p.scanning.mode === 'auto1' && (
            <Slider label={t('scanInterval')} value={p.scanning.intervalMs} min={500} max={5000} step={250} format={ms} onChange={(v) => void update({ scanning: { intervalMs: v } })} />
          )}
          <Toggle label={t('scanAudio')} checked={p.scanning.audioCue} onChange={(v) => void update({ scanning: { audioCue: v } })} />
        </Section>

        <Section title={t('voiceSection')}>
          <Slider label={t('rate')} value={p.voice.rate} min={0.6} max={1.4} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => void update({ voice: { rate: Math.round(v * 10) / 10 } })} />
          <Toggle label={t('preferSystem')} hint={t('preferSystemHint')} checked={p.voice.preferSystem} onChange={(v) => void update({ voice: { preferSystem: v } })} />
          <Slider label={t('volume')} value={p.voice.volume} min={0} max={1} step={0.05} format={pct} onChange={(v) => void update({ voice: { volume: v } })} />
          <Slider label={t('sfxVolume')} value={p.voice.sfxVolume} min={0} max={1} step={0.05} format={pct} onChange={(v) => void update({ voice: { sfxVolume: v } })} />
          {sample && (
            <div className={styles.row}>
              <Button variant="soft" icon={<Volume2 />} onActivate={() => void speak({ key: `w.${sample.id}`, text: sample })}>
                {t('testVoice')}
              </Button>
            </div>
          )}
        </Section>

        <Section title={t('aacSection')}>
          <Segmented<'off' | 'top' | 'bottom'>
            label={t('labels')}
            value={labelsValue}
            onChange={(v) => void update({ aac: v === 'off' ? { showLabels: false } : { showLabels: true, labelPos: v } })}
            wrap
            options={(['off', 'top', 'bottom'] as const).map((v) => ({ value: v, label: tk(`labels_${v}`) }))}
          />
          <Toggle label={t('colorCoding')} hint={t('colorHint')} checked={p.aac.colorCoding} onChange={(v) => void update({ aac: { colorCoding: v } })} />
        </Section>

        <Section title={tc('boardMode')}>
          <p className={styles.hint}>{t('boardHint')}</p>
          <div className={styles.spread}>
            <span className={boardMode ? styles.badgeOn : styles.badge}>{boardMode ? t('on') : t('off')}</span>
            <Button variant="soft" icon={<MonitorSmartphone />} onActivate={() => navigate('/board-setup')}>
              {t('boardOpen')}
            </Button>
          </div>
        </Section>

        <PinSettings />
      </Page>
    </>
  )
}
