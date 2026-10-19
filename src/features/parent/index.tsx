import { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { COMMON } from '../../i18n/common'
import { useStrings } from '../../i18n'
import { PageHeader } from '../../ui/PageHeader'
import { ParentGate } from '../../ui/ParentGate'
import About from './About'
import Cards from './Cards'
import Data from './Data'
import ParentHome from './ParentHome'
import styles from './parent.module.css'
import Print from './Print'
import Profiles from './Profiles'
import Progress from './ProgressScreen'
import Settings from './Settings'
import Tips from './Tips'
import { markParentUnlocked, trustedEntry } from './unlock'

/** "Ota-onalar va mutaxassislar uchun / Родителям и специалистам" — the adult area behind the ParentGate. */
export default function ParentArea() {
  const location = useLocation()
  const navigate = useNavigate()
  const tc = useStrings(COMMON)
  const [open, setOpen] = useState(() => trustedEntry(location, import.meta.env.DEV))

  useEffect(() => {
    if (open) markParentUnlocked()
  }, [open])

  if (!open) {
    // Opened directly (bookmark, typed link) without passing the gate in this session.
    return (
      <div className={styles.area}>
        <PageHeader title={tc('navParentsLong')} />
        <ParentGate open onUnlock={() => setOpen(true)} onCancel={() => navigate('/', { replace: true })} />
      </div>
    )
  }

  return (
    <div className={styles.area}>
      <Routes>
        <Route index element={<ParentHome />} />
        <Route path="progress" element={<Progress />} />
        <Route path="tips" element={<Tips />} />
        <Route path="cards" element={<Cards />} />
        <Route path="profiles" element={<Profiles />} />
        <Route path="settings" element={<Settings />} />
        <Route path="data" element={<Data />} />
        <Route path="print" element={<Print />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<ParentHome />} />
      </Routes>
    </div>
  )
}
