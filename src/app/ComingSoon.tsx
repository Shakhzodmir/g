import { useI18n, useStrings } from '../i18n'
import { EmptyState } from '../ui/misc'
import { PageHeader } from '../ui/PageHeader'
import { FEATURES, type FeatureId } from './features'
import { SHELL } from './strings'

export function ComingSoon({ id }: { id: FeatureId }) {
  const { ui } = useI18n()
  const t = useStrings(SHELL)
  const f = FEATURES[id]
  return (
    <>
      <PageHeader title={ui(f.title)} />
      <EmptyState symbol={f.symbol} title={t('comingSoon')} />
    </>
  )
}
