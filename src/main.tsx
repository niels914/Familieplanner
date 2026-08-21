import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Zelf gehost: geen verzoeken naar Google, en de service worker kan ze cachen.
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/fraunces/wght.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Zonder service worker werkt de app ook, alleen zonder meldingen en offline-schil.
    });
  });
}
