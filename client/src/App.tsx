import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getSettings } from './lib/api'
import { applySky, msUntilNextSky, parseSkyChoice, setSkyChoice, skyChoice, subscribeSky } from './lib/time-of-day'
import { MapPage } from './pages/map-page'
import { WorkspacePage } from './pages/workspace-page'

function useClientSky() {
  useEffect(() => {
    let timer = 0
    let cancelled = false
    const schedule = () => {
      window.clearTimeout(timer)
      applySky()
      if (skyChoice() !== 'auto') return
      timer = window.setTimeout(schedule, msUntilNextSky())
    }
    const unsubscribe = subscribeSky(schedule)
    schedule()
    void getSettings()
      .then((settings) => {
        if (cancelled) return
        setSkyChoice(parseSkyChoice(settings.sky))
      })
      .catch(() => {})
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [])
}

export default function App() {
  useClientSky()

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
