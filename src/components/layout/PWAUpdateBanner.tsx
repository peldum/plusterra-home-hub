import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Floating banner that shows when a new PWA version is available.
 * Also provides a manual "check for updates" via a global event.
 */
export const PWAUpdateBanner = () => {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Listen for the custom event dispatched from main.tsx
    const handler = () => setNeedsUpdate(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const handleUpdate = useCallback(() => {
    // Dispatch event that main.tsx will listen to
    window.dispatchEvent(new Event('pwa-do-update'));
    // Fallback: hard reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      for (const reg of registrations || []) {
        await reg.update();
      }
      // If no update found after 3s, stop checking
      setTimeout(() => setChecking(false), 3000);
    } catch {
      setChecking(false);
    }
  }, []);

  if (needsUpdate) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Nueva versión disponible</span>
        <button
          onClick={handleUpdate}
          className="bg-white/20 hover:bg-white/30 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Actualizar
        </button>
      </div>
    );
  }

  // Show a subtle pull-to-check button on standalone PWA mode
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  if (!isStandalone) return null;

  return (
    <button
      onClick={handleCheckUpdate}
      disabled={checking}
      className="fixed bottom-4 right-4 z-[90] bg-muted/80 backdrop-blur text-muted-foreground p-2.5 rounded-full shadow-lg transition-all hover:bg-muted active:scale-95"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Buscar actualizaciones"
    >
      <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
    </button>
  );
};
