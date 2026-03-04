import React from 'react'
import ReactDOM from 'react-dom/client'
import { initDesktopPlatform } from './platform/electron'
import '@shared/i18n'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// Initialize desktop platform before rendering
initDesktopPlatform()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
