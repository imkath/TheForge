import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Polyfill for requestIdleCallback (fixes Firebase web-vitals errors in some browsers)
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = (cb: IdleRequestCallback) => {
    const start = Date.now();
    return window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };
  window.cancelIdleCallback = (id: number) => window.clearTimeout(id);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
