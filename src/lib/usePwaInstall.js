/**
 * usePwaInstall — small hook around the PWA install flow.
 *
 * The browser fires a `beforeinstallprompt` event when the app is eligible to
 * be installed. That event can fire *before* React mounts, so an early inline
 * script in index.html captures it on `window.__deferredInstallPrompt` and
 * dispatches a `pwa-install-available` event. This hook reads that global on
 * mount and also listens for both events directly, then exposes a
 * `promptInstall()` that replays the saved event and tracks install state so
 * callers can hide their button.
 *
 * Returns:
 *   - canInstall   → true only when an install prompt is available *and* the
 *                    app isn't installed yet (use this to show/hide the button)
 *   - isInstalled  → true once the app runs standalone or `appinstalled` fired
 *   - promptInstall → async () => 'accepted' | 'dismissed' | 'unavailable'
 */
import { useCallback, useEffect, useState } from 'react';

function standaloneNow() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    // iOS Safari
    window.navigator.standalone === true ||
    window.__pwaInstalled === true
  );
}

export function usePwaInstall() {
  // Seed from the event the early inline script may have already captured.
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => (typeof window !== 'undefined' ? window.__deferredInstallPrompt : null) || null,
  );
  const [isInstalled, setIsInstalled] = useState(standaloneNow);

  useEffect(() => {
    // In case the event landed between render and effect.
    if (!deferredPrompt && window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    // Fired by the early inline script when it captures the prompt.
    const onAvailable = () => {
      if (window.__deferredInstallPrompt) setDeferredPrompt(window.__deferredInstallPrompt);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredInstallPrompt = null;
    };

    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = (e) => {
      if (e.matches) onInstalled();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('pwa-install-available', onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    mq?.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('pwa-install-available', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
      mq?.removeEventListener?.('change', onDisplayChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferredPrompt || window.__deferredInstallPrompt;
    if (!evt) return 'unavailable';
    evt.prompt();
    const { outcome } = await evt.userChoice;
    // A prompt can only be used once.
    setDeferredPrompt(null);
    window.__deferredInstallPrompt = null;
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
