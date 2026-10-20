import { Check, MonitorSmartphone, RotateCcw, Volume2 } from 'lucide-react'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { speak } from '../../audio/speech'
import { wordById } from '../../content/vocab'
import { COMMON } from '../../i18n/common'
import { formatNumber, formatQuantity, useI18n, useStrings, type SpeechLang, type UiLang } from '../../i18n'
import { useDevice } from '../../store/device'
import { defaultProfile, useProfileStore, type ScanMode, type Sensory, type ThemeId } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented, Slider, Toggle } from '../../ui/controls'
import { TextSizeControl } from '../../ui/TextSizeControl'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { hashPin } from '../../ui/ParentGate'
import { Pressable } from '../../ui/Pressable'
import styles from './parent.module.css'
import { ConfirmDialog, Section, StorageBanner, useProfileTitle, useT, useTk } from './shared'

const THEMES: ThemeId[] = ['bolajon', 'tun', 'tinch', 'kattalar', 'hc-light', 'hc-dark']

/** Static preview colours (mirrors src/design/tokens.css) — a nested element cannot switch the html-level theme. */
const THEME_PREVIEW: Record<ThemeId, { bg: string; surface: string; text: string; primary: string }> = {
  bolajon: { bg: '#f4f8f7', surface: '#ffffff', text: '#1e2633', primary: '#0a7584' },
  tun: { bg: '#0e1726', surface: '#16233a', text: '#edf2f7', primary: '#4fd1db' },
  tinch: { bg: '#f1f3f2', surface: '#fbfbfa', text: '#283140', primary: '#336d75' },
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
                    {t('swatchAa')}
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
  const [msg, setMsg] = useState<'mismatch' | 'short' | 'saved' | 'cleared' | null>(null)
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6)

  const save = async () => {
    if (!/^\d{4,6}$/.test(a)) {
      setMsg('short')
      return
    }
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
          <input
            className={styles.input}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            maxLength={6}
            value={a}
            aria-describedby="pin-rules"
            onChange={(e) => (setA(digits(e.target.value)), setMsg(null))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('pinRepeat')}</span>
          <input
            className={styles.input}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            maxLength={6}
            value={b}
            onChange={(e) => (setB(digits(e.target.value)), setMsg(null))}
          />
        </label>
        <Button onActivate={() => void save()} disabled={a.length === 0 || b.length === 0}>
          {t('pinSave')}
        </Button>
      </form>
      <p id="pin-rules" className={styles.hint}>
        {t('pinRules')}
      </p>
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
        <p className={msg === 'mismatch' || msg === 'short' ? styles.notice : styles.status} role="status">
          {msg === 'mismatch' ? t('pinMismatch') : msg === 'short' ? t('pinShort') : msg === 'saved' ? t('pinSaved') : t('pinCleared')}
        </p>
      )}
    </Section>
  )
}

/**
 * ONE language control. The script follows the interface language (Latin / Cyrillic / Russian), so the screens can
 * never end up half in one script; the 2026 Latin alphabet is an extra experimental switch shown only for Uzbek.
 */
function InterfaceLanguage() {
  const t = useT()
  const uiLang = useDevice((s) => s.uiLang)
  const uzScript = useDevice((s) => s.uzScript)
  const setUiLang = useDevice((s) => s.setUiLang)
  const setUzScript = useDevice((s) => s.setUzScript)

  // Old saved states could pair a language with the wrong script (uz + Cyrillic, uzc + Latin): derive it again.
  useEffect(() => {
    const want = uiLang === 'uzc' ? 'cyrl' : uiLang === 'uz' && uzScript === 'latn2026' ? 'latn2026' : 'latn'
    if (uzScript !== want) setUzScript(want)
  }, [uiLang, uzScript, setUzScript])

  const change = (next: UiLang) => {
    if (next === uiLang) return
    // Derives the script and switches the speech language of every profile that follows the interface language.
    setUiLang(next)
  }

  return (
    <>
      <Segmented<UiLang>
        label={t('uiLang')}
        value={uiLang}
        onChange={change}
        wrap
        options={[
          // Language names stay in their own script whatever the current interface language is.
          { value: 'uz', label: 'Oʻzbekcha (lotin)' },
          { value: 'uzc', label: 'Ўзбекча (кирилл)' },
          { value: 'ru', label: 'Русский' },
        ]}
      />
      {uiLang === 'uz' && <Toggle label={t('script2026')} hint={t('script2026Hint')} checked={uzScript === 'latn2026'} onChange={(v) => setUzScript(v ? 'latn2026' : 'latn')} />}
      <p className={styles.hint}>{t('uiLangHint')}</p>
    </>
  )
}

/** Recovery path: restores every setting on this screen to its default, whatever state the controls below are in. */
function ResetDefaults({ onReset }: { onReset: () => void }) {
  const t = useT()
  const kind = useProfileStore((s) => s.profile.kind)
  const update = useProfileStore((s) => s.update)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const reset = async () => {
    setOpen(false)
    const d = defaultProfile({ kind })
    await update({
      theme: d.theme,
      sensory: d.sensory,
      textScale: d.textScale,
      speechLangFollowsUi: true,
      touch: d.touch,
      scanning: d.scanning,
      voice: d.voice,
      aac: { level: d.aac.level, showLabels: d.aac.showLabels, labelPos: d.aac.labelPos, colorCoding: d.aac.colorCoding },
    })
    setDone(true)
    onReset()
  }
  return (
    <Section>
      <div className={styles.spread}>
        <p className={styles.hint}>{t('resetHint')}</p>
        <Button variant="soft" icon={<RotateCcw />} onActivate={() => setOpen(true)}>
          {t('resetDefaults')}
        </Button>
      </div>
      {done && (
        <p className={styles.status} role="status">
          {t('resetDone')}
        </p>
      )}
      <ConfirmDialog open={open} title={t('resetDefaults')} text={t('resetQ')} confirm={t('resetDo')} onConfirm={() => void reset()} onClose={() => setOpen(false)} />
    </Section>
  )
}

/** A render error in one of the controls must not blank the screen: the reset button above stays reachable. */
class SettingsBoundary extends Component<{ message: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <p className={styles.notice}>{this.props.message}</p>
    return this.props.children
  }
}

function SettingsBody() {
  const t = useT()
  const tk = useTk()
  const tc = useStrings(COMMON)
  const navigate = useNavigate()
  const name = useProfileTitle()
  const p = useProfileStore((s) => s.profile)
  const update = useProfileStore((s) => s.update)
  const boardMode = useDevice((s) => s.boardMode)
  const setBoardMode = useDevice((s) => s.setBoardMode)
  const { uiLang: lang } = useI18n()
  // Localised numbers and units everywhere (decimal comma; «мс»/«с» in Cyrillic): never a raw "1.5 s".
  const ms = (v: number) => (v === 0 ? t('off') : v >= 1000 ? formatQuantity(v / 1000, 's', lang) : formatQuantity(v, 'ms', lang))
  const pct = (v: number) => `${formatNumber(Math.round(v * 100), lang, 0)}%`
  const labelsValue = !p.aac.showLabels ? 'off' : p.aac.labelPos
  const sample = wordById('water')

  return (
    <>
      <Section title={t('deviceSection')}>
        <p className={styles.hint}>{t('deviceNote')}</p>
        <InterfaceLanguage />
      </Section>

      <Section title={t('profileSection', { name })}>
        <ThemePicker />
        <Segmented<Sensory>
          label={t('sensory')}
          value={p.sensory}
          onChange={(v) => void update({ sensory: v })}
          wrap
          options={(['calm', 'normal', 'festive'] as const).map((v) => ({ value: v, label: tk(`sensory_${v}`) }))}
        />
        <p className={styles.hint}>{t('sensoryHint')}</p>
        <TextSizeControl />
      </Section>

      <Section title={t('touchSection')}>
        <Toggle label={t('activateOnRelease')} hint={t('aorHint')} checked={p.touch.activateOnRelease} onChange={(v) => void update({ touch: { activateOnRelease: v } })} />
        <Slider label={t('holdMs')} hint={t('holdHint')} value={p.touch.holdMs} min={0} max={1500} step={100} format={ms} onChange={(v) => void update({ touch: { holdMs: v } })} />
        <Slider label={t('ignoreRepeat')} hint={t('ignoreRepeatHint')} value={p.touch.ignoreRepeatMs} min={0} max={2000} step={100} format={ms} onChange={(v) => void update({ touch: { ignoreRepeatMs: v } })} />
        <Slider label={t('dwell')} hint={t('dwellHint')} value={p.touch.dwellMs} min={0} max={2000} step={250} format={ms} onChange={(v) => void update({ touch: { dwellMs: v } })} />
        <p className={styles.hint}>{t('adultZoneNote')}</p>
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
        <Toggle
          label={t('speechSeparate')}
          hint={t('speechSeparateHint')}
          checked={!p.speechLangFollowsUi}
          onChange={(v) => void update(v ? { speechLangFollowsUi: false } : { speechLangFollowsUi: true })}
        />
        {!p.speechLangFollowsUi && (
          <>
            <Segmented<SpeechLang>
              label={t('speechLang')}
              value={p.speechLang}
              onChange={(v) => void update({ speechLang: v })}
              options={[
                { value: 'uz', label: t('langUz') },
                { value: 'ru', label: t('langRu') },
              ]}
            />
            <p className={styles.hint}>{t('speechSeparateNote')}</p>
          </>
        )}
        <Slider label={t('rate')} value={p.voice.rate} min={0.6} max={1.4} step={0.1} format={(v) => formatQuantity(v, 'x', lang)} onChange={(v) => void update({ voice: { rate: Math.round(v * 10) / 10 } })} />
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
          <Toggle label={tc('boardMode')} checked={boardMode} onChange={setBoardMode} />
          <Button variant="soft" icon={<MonitorSmartphone />} onActivate={() => navigate('/board-setup')}>
            {t('boardOpen')}
          </Button>
        </div>
      </Section>

      <PinSettings />
    </>
  )
}

export default function Settings() {
  const t = useT()
  const [epoch, setEpoch] = useState(0)
  return (
    <>
      <PageHeader title={t('secSettings')} back="/parent" />
      <Page width="narrow">
        <StorageBanner />
        <ResetDefaults onReset={() => setEpoch((n) => n + 1)} />
        <SettingsBoundary key={epoch} message={t('settingsBroken')}>
          <SettingsBody />
        </SettingsBoundary>
      </Page>
    </>
  )
}
