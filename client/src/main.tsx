import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bindSky } from './lib/time-of-day'
import './index.css'

bindSky()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
