import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { CorpusProvider } from './context/CorpusContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CorpusProvider>
      <App />
    </CorpusProvider>
  </StrictMode>,
)
