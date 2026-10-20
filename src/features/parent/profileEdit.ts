import { db, dbAvailable } from '../../store/db'
import { useProfileStore, kindSwitchPatch, mergeProfile, sanitizeProfile, type AgeGroup, type Profile, type ProfilePatch } from '../../store/profile'
import { cleanName } from './model'

export const AGE_GROUPS: AgeGroup[] = ['2-4', '5-7', '8-12', '13+']

/** The age group a new profile starts with. */
export const defaultAgeFor = (kind: Profile['kind']): AgeGroup => (kind === 'adult' ? '13+' : '5-7')

export interface ProfileForm {
  name: string
  avatar: string
  ageGroup: AgeGroup
  kind: Profile['kind']
}

/** The name is required: invisible characters alone do not count. Returns the cleaned name or null. */
export function validName(raw: string): string | null {
  const n = cleanName(raw)
  return n.length > 0 ? n : null
}

/** True when saving this form changes the mode (child ↔ adult): the caller asks for confirmation first. */
export function switchesKind(old: Profile | null, form: ProfileForm): boolean {
  return !!old && old.kind !== form.kind
}

/**
 * Settings that follow the kind of person. A new profile starts from its kind's defaults; switching child ↔ adult
 * re-applies the new kind's theme, sensory level and AAC level (name, language, avatar, history and the rest stay).
 */
export function patchFromForm(old: Profile | null, form: ProfileForm): ProfilePatch {
  const name = validName(form.name) ?? ''
  const patch: ProfilePatch = { name, avatar: form.avatar, ageGroup: form.ageGroup, kind: form.kind }
  if (!old || old.kind !== form.kind) {
    const k = kindSwitchPatch(form.kind)
    patch.theme = k.theme
    patch.sensory = k.sensory
    patch.aac = k.aac
  }
  return patch
}

/**
 * Edits any profile (not only the active one). The store's update() only knows the active profile, so for
 * another profile the row is written directly and the in-memory list is refreshed.
 */
export async function saveProfileEdit(target: Profile, patch: ProfilePatch): Promise<void> {
  const store = useProfileStore.getState()
  if (store.profile.id === target.id) {
    await store.update(patch)
    return
  }
  const merged = sanitizeProfile(mergeProfile(target, patch))
  if (await dbAvailable()) await db.profiles.put(merged).catch(() => undefined)
  useProfileStore.setState((s) => ({ profiles: s.profiles.map((p) => (p.id === merged.id ? merged : p)) }))
}
