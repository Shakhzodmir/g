import { create } from 'zustand'
import { db, dbAvailable, newId } from './db'
import { useDevice } from './device'
import { DEFAULT_PROFILE_ID, defaultProfile, mergeProfile, sanitizeProfile, type Profile, type ProfilePatch, type Sensory } from './profileTypes'

export * from './profileTypes'

interface ProfileState {
  profile: Profile
  profiles: Profile[]
  loaded: boolean
  /** False when IndexedDB is unavailable; everything keeps working in memory. */
  persistent: boolean
  load: () => Promise<void>
  update: (patch: ProfilePatch) => Promise<void>
  create: (patch: ProfilePatch) => Promise<Profile>
  switchTo: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

/**
 * Session-only sensory override (the teacher's "Tinch rejim" on the board). While it is active the in-memory
 * profile shows the override, but storage always receives the user's own saved level (`sessionSensoryBase`).
 */
let sessionSensoryBase: Sensory | null = null

export function sessionSensoryActive(): boolean {
  return sessionSensoryBase !== null
}

/** Sets (level) or ends (null) the session override; ending restores exactly the previous level. */
export function setSessionSensory(level: Sensory | null): void {
  const { profile } = useProfileStore.getState()
  if (level === null) {
    if (sessionSensoryBase === null) return
    const back = sessionSensoryBase
    sessionSensoryBase = null
    useProfileStore.setState({ profile: { ...profile, sensory: back } })
    return
  }
  if (sessionSensoryBase === null) sessionSensoryBase = profile.sensory
  if (profile.sensory !== level) useProfileStore.setState({ profile: { ...profile, sensory: level } })
}

async function persist(profile: Profile): Promise<boolean> {
  if (!(await dbAvailable())) return false
  try {
    await db.profiles.put(sessionSensoryBase === null ? profile : { ...profile, sensory: sessionSensoryBase })
    return true
  } catch {
    return false
  }
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: defaultProfile(),
  profiles: [],
  loaded: false,
  persistent: false,

  load: async () => {
    const ok = await dbAvailable()
    if (!ok) {
      set({ loaded: true, persistent: false, profiles: [get().profile] })
      return
    }
    try {
      const all = await db.profiles.toArray()
      const wanted = useDevice.getState().activeProfileId
      const active = all.find((p) => p.id === wanted) ?? all[0]
      if (active) {
        // Merge with defaults so profiles saved by older versions gain new settings.
        const profile = sanitizeProfile(active)
        set({ profile, profiles: all.map((p) => sanitizeProfile(p)), loaded: true, persistent: true })
        useDevice.getState().setActiveProfileId(profile.id)
      } else {
        set({ profiles: [get().profile], loaded: true, persistent: true })
      }
    } catch {
      set({ loaded: true, persistent: false })
    }
  },

  update: async (patch) => {
    // An explicit choice of the sensory level ends the temporary override.
    if (patch.sensory !== undefined) sessionSensoryBase = null
    const profile = mergeProfile(get().profile, patch)
    set({ profile, profiles: replace(get().profiles, profile) })
    const ok = await persist(profile)
    if (!ok && get().persistent) set({ persistent: false })
  },

  create: async (patch) => {
    const profile = defaultProfile({ ...patch, id: patch.id ?? newId('p-'), createdAt: Date.now() })
    await persist(profile)
    set({ profile, profiles: replace(get().profiles.filter((p) => p.id !== DEFAULT_PROFILE_ID || p.createdAt > 0), profile) })
    useDevice.getState().setActiveProfileId(profile.id)
    return profile
  },

  switchTo: async (id) => {
    const found = get().profiles.find((p) => p.id === id)
    if (!found) return
    sessionSensoryBase = null
    set({ profile: sanitizeProfile(found) })
    useDevice.getState().setActiveProfileId(id)
  },

  remove: async (id) => {
    const rest = get().profiles.filter((p) => p.id !== id)
    set({ profiles: rest })
    if (await dbAvailable()) {
      await db.transaction('rw', [db.profiles, db.cards, db.recordings, db.events, db.schedules, db.stickers], async () => {
        await db.profiles.delete(id)
        await db.cards.where('profileId').equals(id).delete()
        await db.recordings.where('profileId').equals(id).delete()
        await db.events.where('profileId').equals(id).delete()
        await db.schedules.where('profileId').equals(id).delete()
        await db.stickers.where('profileId').equals(id).delete()
      }).catch(() => undefined)
    }
    if (get().profile.id === id) {
      const next = rest[0] ?? defaultProfile()
      set({ profile: next, profiles: rest.length ? rest : [next] })
      useDevice.getState().setActiveProfileId(rest[0]?.id ?? null)
    }
  },
}))

function replace(list: Profile[], p: Profile): Profile[] {
  const i = list.findIndex((x) => x.id === p.id)
  if (i === -1) return [...list, p]
  const copy = list.slice()
  copy[i] = p
  return copy
}

/** Current profile (always defined; an in-memory default exists before onboarding). */
export function useProfile(): Profile {
  return useProfileStore((s) => s.profile)
}

export function getProfile(): Profile {
  return useProfileStore.getState().profile
}
