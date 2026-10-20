import { useMemo } from 'react'
import { appUrl } from '../../lib/appUrl'
import { renderWithVars } from '../../i18n'
import { useDevice } from '../../store/device'
import { ROLE_KEY } from '../help/labels'
import { AMBULANCE_NUMBER, type Contact } from '../help/model'
import { H } from '../help/strings'
import { useContacts } from '../help/store'
import { balancedPages } from './diary'
import { PrintPages, PrintSheet } from './PrintSheet'
import { htmlLangOf, useSheetSubtitle, useSheetT, type SheetLang } from './sheetLang'
import sheets from './sheets.module.css'

export const CONTACTS_ROUTE = '/parent/help'

/** Rows on one page and the fewest rows printed (the empty ones are for writing by hand). */
export const CONTACT_ROWS_PER_PAGE = 11
export const CONTACT_MIN_ROWS = 10

/** The family's contacts, then blank rows up to the minimum, split evenly over A4 pages. Empty entries are `null`. */
export function contactRows(list: readonly Contact[], perPage = CONTACT_ROWS_PER_PAGE, minRows = CONTACT_MIN_ROWS): Array<Array<Contact | null>> {
  const rows: Array<Contact | null> = [...list]
  while (rows.length < minRows) rows.push(null)
  return balancedPages(rows, perPage)
}

/** «Muhim telefonlar / Важные телефоны»: the ambulance number, the family's own contact book and blank rows, for the fridge door. */
export default function ContactsSheet({ lang }: { lang: SheetLang }) {
  const t = useSheetT(lang)
  const sub = useSheetSubtitle(lang)
  const uzScript = useDevice((s) => s.uzScript)
  const contacts = useContacts((s) => s.contacts)
  const pages = useMemo(() => contactRows(contacts), [contacts])
  const role = (c: Contact) => renderWithVars({ uz: H.uz[ROLE_KEY[c.role]], ru: H.ru[ROLE_KEY[c.role]] }, lang, uzScript)
  const total = pages.length

  return (
    <PrintPages>
      {pages.map((rows, pi) => (
        <PrintSheet
          key={pi}
          lang={htmlLangOf(lang)}
          title={t('cTitle')}
          subtitle={sub('cTitle')}
          qr={{ route: CONTACTS_ROUTE, caption: t('cQr'), alt: t('qrAlt', { url: appUrl(CONTACTS_ROUTE) }) }}
          footerNote={
            <>
              <span>{t('sheetApp')}</span>
              <span>{t('sheetDisclaimer')}</span>
              {total > 1 && <span>{t('pageOf', { n: pi + 1, total })}</span>}
            </>
          }
        >
          {pi === 0 && (
            <div className={sheets.emergency}>
              <span className={sheets.emergencyNum}>{AMBULANCE_NUMBER}</span>
              <div>
                <h3 className={sheets.emergencyTitle}>{t('cEmergency')}</h3>
                <p>{t('cEmergencyText')}</p>
              </div>
            </div>
          )}

          <div className={sheets.cTable} role="table" aria-label={t('cTitle')}>
            <div className={[sheets.cRow, sheets.cHead].join(' ')} role="row">
              <span role="columnheader">{t('cWho')}</span>
              <span role="columnheader">{t('cName')}</span>
              <span role="columnheader">{t('cPhone')}</span>
              <span role="columnheader">{t('cPlace')}</span>
            </div>
            {rows.map((c, i) => (
              <div key={c?.id ?? `blank${pi}-${i}`} className={sheets.cRow} role="row">
                <span role="cell" className={sheets.cRole}>
                  {c && <span className={sheets.cClamp} data-clamp="">{role(c)}</span>}
                </span>
                <span role="cell" className={sheets.cName}>
                  {c?.name && <span className={sheets.cClamp} data-clamp="">{c.name}</span>}
                </span>
                <span role="cell" className={sheets.cPhone}>
                  {c?.phone}
                </span>
                <span role="cell" className={sheets.cPlace}>
                  {c && (c.place || c.note) && <span className={sheets.cClamp} data-clamp="">{[c.place, c.note].filter(Boolean).join(' · ')}</span>}
                </span>
              </div>
            ))}
          </div>
          <p className={sheets.note}>{t('cFill')}</p>
        </PrintSheet>
      ))}
    </PrintPages>
  )
}
