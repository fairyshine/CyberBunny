import React from 'react';
import ReactDOM from 'react-dom/client';
import '@shared/i18n';
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
