import React from 'react';
import ReactDOM from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { initializeSharedI18n } from '@openbunny/shared/i18n';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

export function renderOpenBunnyApp(root: HTMLElement): void {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

export async function bootstrapOpenBunnyDOMApp(initPlatform: () => void, rootId: string = 'root'): Promise<void> {
  await initializeSharedI18n([initReactI18next]);
  initPlatform();

  const root = document.getElementById(rootId);
  if (!root) {
    throw new Error(`OpenBunny root element not found: #${rootId}`);
  }

  renderOpenBunnyApp(root);
}
