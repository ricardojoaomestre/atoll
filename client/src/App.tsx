import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MapPage } from './pages/map-page'
import { WorkspacePage } from './pages/workspace-page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
