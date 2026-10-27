import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload on stale deployment chunk failures (Vite preload error)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = sessionStorage.getItem('last_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 8000) {
    sessionStorage.setItem('last_chunk_reload', String(now));
    window.location.reload();
  }
});

// Fallback for unhandled dynamic import errors
window.addEventListener('error', (e) => {
  const msg = e?.message || '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('error loading dynamically imported module')) {
    const lastReload = sessionStorage.getItem('last_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 8000) {
      sessionStorage.setItem('last_chunk_reload', String(now));
      window.location.reload();
    }
  }
});

// Proactive Backend Warmup & Keep-Alive (Prevents 15-minute Render sleep & ensures <1s instant response)
const warmBackend = () => {
  try {
    fetch('/api/health', { method: 'GET', keepalive: true }).catch(() => {});
  } catch (e) {}
};
warmBackend();
setInterval(warmBackend, 4 * 60 * 1000);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
