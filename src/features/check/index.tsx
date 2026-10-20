import { Navigate, Route, Routes } from 'react-router'
import { checkPath } from './Bits'
import Hub from './Hub'
import Overview from './Overview'
import Report from './ReportView'
import Run from './Run'

/** "Nutq tekshiruvi / Проверка речи": mounted at /parent/check/* (inside the adult gate). */
export default function Check() {
  return (
    <Routes>
      <Route index element={<Hub />} />
      <Route path=":kind" element={<Overview />} />
      <Route path=":kind/run" element={<Run />} />
      <Route path=":kind/report" element={<Report />} />
      <Route path="*" element={<Navigate to={checkPath()} replace />} />
    </Routes>
  )
}
