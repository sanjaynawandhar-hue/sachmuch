'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker, which is what makes the app installable.
 *
 * Registration is deferred to the load event: doing it during hydration
 * competes with the first feed render for the same main thread, on the phones
 * that can least afford it.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // A failed registration costs installability, not the app. Nothing to do.
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
