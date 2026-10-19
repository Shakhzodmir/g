import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { COMMON } from '../../i18n/common'
import { useStrings, type SpeechLang } from '../../i18n'
import { useDevice } from '../../store/device'
import { useProfileStore, type AgeGroup, type Profile } from '../../store/profile'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/controls'
import { Dialog } from '../../ui/Dialog'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Pressable } from '../../ui/Pressable'
import { SymbolImg } from '../../ui/SymbolImg'
import { MAX_NAME_LEN } from './model'
import styles from './parent.module.css'
import { AGE_GROUPS, defaultAgeFor, patchFromForm, saveProfileEdit, validName, type ProfileForm } from './profileEdit'
import { AVATARS, avatarSymbol, ConfirmDialog, Section, StorageBanner, useT, useTk } from './shared'
import { clearProfileDeviceState } from './wipe'

/** A fresh form: nothing is remembered from the previous time the dialog was open. */
function blankForm(uiRu: boolean): ProfileForm {
  return { name: '', avatar: AVATARS[0], ageGroup: defaultAgeFor('child'), kind: 'child', speechLang: uiRu ? 'ru' : 'uz' }
}

function formOf(p: Profile): ProfileForm {
  return { name: p.name, avatar: p.avatar, ageGroup: p.ageGroup, kind: p.kind, speechLang: p.speechLang }
}

/** Shared fields of the create and edit dialogs. */
function ProfileFields({ form, setForm, touchedAge, onAge, showError }: { form: ProfileForm; setForm: (f: ProfileForm) => void; touchedAge: boolean; onAge: () => void; showError: boolean }) {
  const t = useT()
  const tk = useTk()
  const set = (patch: Partial<ProfileForm>) => setForm({ ...form, ...patch })
  const nameMissing = validName(form.name) === null
  return (
    <>
      <Segmented
        label={t('whoUses')}
        value={form.kind}
        onChange={(kind) => set({ kind, ageGroup: touchedAge ? form.ageGroup : defaultAgeFor(kind) })}
        options={[
          { value: 'child', label: t('kindChild') },
          { value: 'adult', label: t('kindAdult') },
        ]}
      />
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('nameLabel')}</span>
        <input
          className={styles.input}
          value={form.name}
          maxLength={MAX_NAME_LEN}
          autoComplete="off"
          aria-required="true"
          aria-invalid={showError && nameMissing ? true : undefined}
          aria-describedby="profile-name-hint"
          onChange={(e) => set({ name: e.target.value })}
        />
        <span id="profile-name-hint" className={showError && nameMissing ? styles.errorText : styles.hint}>
          {showError && nameMissing ? t('nameRequired') : t('nameHint')}
        </span>
      </label>
      <Segmented<AgeGroup>
        label={t('ageLabel')}
        value={form.ageGroup}
        onChange={(ageGroup) => {
          onAge()
          set({ ageGroup })
        }}
        wrap
        options={AGE_GROUPS.map((a) => ({ value: a, label: a.replace('-', '–') }))}
      />
      <p className={styles.hint}>{t('ageHint')}</p>
      <div className={styles.field} role="group" aria-label={t('avatar')}>
        <span className={styles.fieldLabel}>{t('avatar')}</span>
        <div className={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <Pressable key={a} className={styles.avatarBtn} label={tk(`av_${a}`)} pressed={form.avatar === a} onActivate={() => set({ avatar: a })}>
              <SymbolImg id={a} />
            </Pressable>
          ))}
        </div>
      </div>
      <Segmented<SpeechLang>
        label={t('speechLang')}
        value={form.speechLang}
        onChange={(speechLang) => set({ speechLang })}
        options={[
          { value: 'uz', label: t('langUz') },
          { value: 'ru', label: t('langRu') },
        ]}
      />
    </>
  )
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const tc = useStrings(COMMON)
  const create = useProfileStore((s) => s.create)
  // The speech language starts from the interface language, never from the previously created profile.
  const uiRu = useDevice((s) => s.uiLang === 'ru')
  const [form, setForm] = useState<ProfileForm>(() => blankForm(uiRu))
  const [touchedAge, setTouchedAge] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  // Every time the dialog opens it starts from the same blank form (no leftovers from the last profile).
  useEffect(() => {
    if (!open) return
    setForm(blankForm(uiRu))
    setTouchedAge(false)
    setTried(false)
    setBusy(false)
  }, [open, uiRu])

  const submit = async () => {
    setTried(true)
    if (validName(form.name) === null || busy) return
    setBusy(true)
    await create(patchFromForm(null, form))
    setBusy(false)
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
      <ProfileFields form={form} setForm={setForm} touchedAge={touchedAge} onAge={() => setTouchedAge(true)} showError={tried} />
    </Dialog>
  )
}

function EditDialog({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const t = useT()
  const tc = useStrings(COMMON)
  const [form, setForm] = useState<ProfileForm>(() => (profile ? formOf(profile) : blankForm(false)))
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm(formOf(profile))
    setTried(false)
    setBusy(false)
  }, [profile])

  const submit = async () => {
    setTried(true)
    if (!profile || validName(form.name) === null || busy) return
    setBusy(true)
    await saveProfileEdit(profile, patchFromForm(profile, form))
    setBusy(false)
    onClose()
  }

  return (
    <Dialog
      open={!!profile}
      onClose={onClose}
      title={t('editProfile')}
      footer={
        <>
          <Button variant="ghost" onActivate={onClose}>
            {tc('cancel')}
          </Button>
          <Button onActivate={() => void submit()} disabled={busy}>
            {tc('save')}
          </Button>
        </>
      }
    >
      <ProfileFields form={form} setForm={setForm} touchedAge onAge={() => undefined} showError={tried} />
    </Dialog>
  )
}

export default function Profiles() {
  const t = useT()
  const tk = useTk()
  const tc = useStrings(COMMON)
  const profiles = useProfileStore((s) => s.profiles)
  const current = useProfileStore((s) => s.profile)
  const switchTo = useProfileStore((s) => s.switchTo)
  const remove = useProfileStore((s) => s.remove)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)
  const list = profiles.length ? profiles : [current]
  const nameOf = (p: Profile) => p.name.trim() || t('noName')

  return (
    <>
      <PageHeader title={t('secProfiles')} back="/parent" />
      <Page width="narrow">
        <StorageBanner />
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
                      {p.kind === 'adult' ? t('kindAdult') : t('kindChild')} · {tk(`age_${p.ageGroup}`)} · {p.speechLang === 'ru' ? t('langRu') : t('langUz')}
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
                    <Button variant="ghost" iconOnly icon={<Pencil />} label={t('editProfileLabel', { name: nameOf(p) })} onActivate={() => setEditing(p)}>
                      {t('editProfileLabel', { name: nameOf(p) })}
                    </Button>
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
      <EditDialog profile={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('deleteProfile')}
        text={deleting ? t('deleteProfileQ', { name: nameOf(deleting) }) : ''}
        confirm={tc('delete')}
        onConfirm={() => {
          const p = deleting
          setDeleting(null)
          if (p) void remove(p.id).then(() => clearProfileDeviceState(p.id))
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
