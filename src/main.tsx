import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initPerfMode, initNarrowPhoneClass, getSwUpdateIntervalMs } from './lib/perfMode';

initPerfMode();
initNarrowPhoneClass();

const SW_UPDATE_INTERVAL_MS = getSwUpdateIntervalMs();

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      window.setInterval(() => {
        void registration.update().catch(() => undefined);
      }, SW_UPDATE_INTERVAL_MS);
    },
  });
} else {
  // In development mode, safely unregister any residual ServiceWorkers to prevent MIME type & stale cache conflicts
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => undefined);
      }
    }).catch(() => undefined);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
