import { ChartNoAxesColumn, ClipboardCheck, Phone, Printer, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { PageHeader } from '../../ui/PageHeader'
import { Section, StorageBanner } from '../parent/shared'
import parent from '../parent/parent.module.css'
import ContactBook from './ContactBook'
import styles from './help.module.css'
import { AMBULANCE_NUMBER } from './model'
import type { HKey } from './strings'
import { useH } from './useH'

/** Route of this page (the check feature links here). */
export const HELP_PATH = '/parent/help'

const CHILD: ReadonlyArray<{ title: HKey; desc: HKey }> = [
  { title: 'whoFirstStep', desc: 'descDoctor' },
  { title: 'roleLogoped', desc: 'descLogoped' },
  { title: 'roleEnt', desc: 'descEnt' },
  { title: 'roleNeurologist', desc: 'descNeurologist' },
  { title: 'rolePsychologist', desc: 'descPsychologist' },
  { title: 'roleCentre', desc: 'descCentre' },
]

const ADULT: ReadonlyArray<{ title: HKey; desc: HKey }> = [
  { title: 'adultNeurologist', desc: 'adultNeurologistDesc' },
  { title: 'adultRehab', desc: 'adultRehabDesc' },
  { title: 'adultLogoped', desc: 'adultLogopedDesc' },
]

const PREP: readonly HKey[] = ['prep1', 'prep2', 'prep3', 'prep4', 'prep5']

function Roles({ title, items }: { title: string; items: ReadonlyArray<{ title: HKey; desc: HKey }> }) {
  const h = useH()
  return (
    <div className={parent.tight}>
      <h3 className={parent.h3}>{title}</h3>
      <ul className={styles.roles}>
        {items.map((r) => (
          <li key={r.title} className={styles.role}>
            <span className={parent.itemMain}>{h(r.title)}</span>
            <span className={parent.itemSub}>{h(r.desc)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** «Qayerga murojaat qilish / Куда обратиться»: when not to wait, who can help, how to prepare, and the family's own contact book. */
export default function Help() {
  const h = useH()
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title={h('title')} back="/parent" />
      <Page width="narrow">
        <p className={parent.intro}>{h('intro')}</p>
        <StorageBanner />

        <section className={styles.urgent} role="note" aria-labelledby="help-urgent" data-testid="help-urgent">
          <TriangleAlert aria-hidden="true" />
          <div className={parent.tight}>
            <h2 id="help-urgent" className={parent.h2}>
              {h('urgentTitle')}
            </h2>
            <p>{h('urgentChild', { num: AMBULANCE_NUMBER })}</p>
            <p>{h('urgentAdult', { num: AMBULANCE_NUMBER })}</p>
            <a className={styles.call} href={`tel:${AMBULANCE_NUMBER}`}>
              <Phone aria-hidden="true" />
              <span>{h('callAmbulance', { num: AMBULANCE_NUMBER })}</span>
            </a>
          </div>
        </section>

        <Section title={h('whoTitle')}>
          <Roles title={h('whoChild')} items={CHILD} />
          <Roles title={h('whoAdult')} items={ADULT} />
        </Section>

        <Section title={h('prepTitle')}>
          <ul className={styles.prep}>
            {PREP.map((k) => (
              <li key={k}>{h(k)}</li>
            ))}
          </ul>
          <div className={parent.row}>
            <Button variant="soft" icon={<ChartNoAxesColumn />} onActivate={() => navigate('/parent/progress')}>
              {h('goProgress')}
            </Button>
            <Button variant="soft" icon={<Printer />} onActivate={() => navigate('/parent/print')}>
              {h('goPrint')}
            </Button>
            <Button variant="soft" icon={<ClipboardCheck />} onActivate={() => navigate('/parent/check')}>
              {h('goCheck')}
            </Button>
          </div>
        </Section>

        <ContactBook />
      </Page>
    </>
  )
}
