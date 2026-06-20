/**
 * usePwaInstall — small hook around the PWA install flow.
 *
 * The browser fires a `beforeinstallprompt` event when the app is eligible to
 * be installed. We capture it, expose a `promptInstall()` that replays it, and
 * track whether the app is already installed so callers can hide their button.
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
    window.navigator.standalone === true
  );
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(standaloneNow);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      // Stop Chrome's mini-infobar so we can trigger the prompt from our button.
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = (e) => {
      if (e.matches) onInstalled();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    mq?.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // A prompt can only be used once.
    setDeferredPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
