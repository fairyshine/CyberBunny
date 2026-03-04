import React from 'react'
import ReactDOM from 'react-dom/client'
import { initBrowserPlatform } from './platform/browser'
import '@shared/i18n'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// Initialize browser platform before rendering
initBrowserPlatform()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
