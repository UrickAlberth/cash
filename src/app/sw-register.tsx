'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Service worker registration failed:', err);
        }
      });
    }
  }, []);

  return null;
}
