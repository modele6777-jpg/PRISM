import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initPerfMode, initNarrowPhoneClass, getSwUpdateIntervalMs } from './lib/perfMode';

initPerfMode();
initNarrowPhoneClass();

const SW_UPDATE_INTERVAL_MS = getSwUpdateIntervalMs();

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    window.setInterval(() => {
      void registration.update().catch(() => undefined);
    }, SW_UPDATE_INTERVAL_MS);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
