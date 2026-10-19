import { useStrings } from '../i18n'
import { TEXT_SCALES, useProfileStore, type TextScale } from '../store/profile'
import { Segmented } from './controls'
import { UI } from './strings'

/** «Matn o'lchami / Размер текста»: 100–200 % of the browser's own text size (Profile.textScale). */
export function TextSizeControl() {
  const t = useStrings(UI)
  const scale = useProfileStore((s) => s.profile.textScale)
  const update = useProfileStore((s) => s.update)
  return (
    <Segmented<string>
      label={t('textSize')}
      value={String(scale)}
      onChange={(v) => void update({ textScale: Number(v) as TextScale })}
      wrap
      options={TEXT_SCALES.map((v) => ({ value: String(v), label: `${Math.round(v * 100)}%` }))}
    />
  )
}
