import { useDevice } from '../../store/device'
import { useProfileStore } from '../../store/profile'

/** BCP-47 tag of the text shown by `useLabel` (the profile's speech language; Uzbek in the device's script). */
export function useSpeechHtmlLang(): 'ru' | 'uz-Cyrl' | 'uz-Latn' {
  const speechLang = useProfileStore((s) => s.profile.speechLang)
  const uzScript = useDevice((s) => s.uzScript)
  return speechLang === 'ru' ? 'ru' : uzScript === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn'
}
