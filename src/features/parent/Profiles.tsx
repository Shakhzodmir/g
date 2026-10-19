import { Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { COMMON } from '../../i18n/common'
import { useStrings, type SpeechLang } from '../../i18n'
import { useDevice } from '../../store/device'
import { useProfileStore, type Profile } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import styles from './parent.module.css'
import { AVATARS, avatarSymbol, ConfirmDialog, Section, useT, useTk } from './shared'

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const tk = useTk()
  const tc = useStrings(COMMON)
  const create = useProfileStore((s) => s.create)
  const uiLang = useDevice((s) => s.uiLang)
  const [kind, setKind] = useState<'child' | 'adult'>('child')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATARS[0])
  const [speech, setSpeech] = useState<SpeechLang>(uiLang === 'ru' ? 'ru' : 'uz')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    await create({ kind, name: name.trim(), avatar, speechLang: speech, theme: kind === 'adult' ? 'kattalar' : 'bolajon' })
    setBusy(false)
    setName('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('createProfile')}
      footer={
        <>
          <Button variant="ghost" onActivate={onClose}>
            {tc('cancel')}
          </Button>
          <Button onActivate={() => void submit()} disabled={busy}>
            {t('create')}
          </Button>
        </>
      }
    >
      <Segmented
        label={t('whoUses')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'child', label: t('kindChild') },
          { value: 'adult', label: t('kindAdult') },
        ]}
      />
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('nameLabel')}</span>
        <input className={styles.input} value={name} maxLength={30} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.field} role="group" aria-label={t('avatar')}>
        <span className={styles.fieldLabel}>{t('avatar')}</span>
        <div className={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <Pressable key={a} className={styles.avatarBtn} label={tk(`av_${a}`)} pressed={avatar === a} onActivate={() => setAvatar(a)}>
              <SymbolImg id={a} />
            </Pressable>
          ))}
        </div>
      </div>
      <Segmented
        label={t('speechLang')}
        value={speech}
        onChange={setSpeech}
        options={[
          { value: 'uz', label: t('langUz') },
          { value: 'ru', label: t('langRu') },
        ]}
      />
    </Dialog>
  )
}

export default function Profiles() {
  const t = useT()
  const tc = useStrings(COMMON)
  const profiles = useProfileStore((s) => s.profiles)
  const current = useProfileStore((s) => s.profile)
  const switchTo = useProfileStore((s) => s.switchTo)
  const remove = useProfileStore((s) => s.remove)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Profile | null>(null)
  const list = profiles.length ? profiles : [current]
  const nameOf = (p: Profile) => p.name.trim() || t('noName')

  return (
    <>
      <PageHeader title={t('secProfiles')} back="/parent" />
      <Page width="narrow">
        <Section>
          <ul className={styles.list}>
            {list.map((p) => {
              const isCurrent = p.id === current.id
              return (
                <li key={p.id} className={styles.itemRow} data-wide="">
                  <SymbolImg id={avatarSymbol(p)} className={styles.itemSym} />
                  <span className={styles.itemText}>
                    <span className={styles.itemMain}>{nameOf(p)}</span>
                    <span className={styles.itemSub}>
                      {p.kind === 'adult' ? t('kindAdult') : t('kindChild')} · {p.speechLang === 'ru' ? t('langRu') : t('langUz')}
                    </span>
                    {isCurrent && (
                      <span className={styles.badges}>
                        <span className={styles.badgeOn}>
                          <Check aria-hidden="true" />
                          {t('current')}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className={styles.actions}>
                    {!isCurrent && (
                      <Button variant="soft" label={t('switchLabel', { name: nameOf(p) })} onActivate={() => void switchTo(p.id)}>
                        {t('switchTo')}
                      </Button>
                    )}
                    {list.length > 1 && (
                      <Button variant="ghost" iconOnly icon={<Trash2 />} label={t('deleteProfileLabel', { name: nameOf(p) })} onActivate={() => setDeleting(p)}>
                        {t('deleteProfileLabel', { name: nameOf(p) })}
                      </Button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {list.length <= 1 && <p className={styles.hint}>{t('lastProfile')}</p>}
          <div className={styles.row}>
            <Button variant="soft" icon={<Plus />} onActivate={() => setCreating(true)}>
              {t('createProfile')}
            </Button>
          </div>
        </Section>
      </Page>
      <CreateDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('deleteProfile')}
        text={deleting ? t('deleteProfileQ', { name: nameOf(deleting) }) : ''}
        confirm={tc('delete')}
        onConfirm={() => {
          const p = deleting
          setDeleting(null)
          if (p) void remove(p.id)
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
