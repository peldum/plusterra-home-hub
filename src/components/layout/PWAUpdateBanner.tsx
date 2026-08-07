import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Top-bar banner shown inside the admin panel when a new PWA version is available.
 * Replaces the old floating icon. Auto-dismisses after 30s if ignored.
 */
export const PWAUpdateBanner = () => {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = () => setNeedsUpdate(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!needsUpdate || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 30_000);
    return () => clearTimeout(timer);
  }, [needsUpdate, dismissed]);

  const handleUpdate = useCallback(() => {
    if (updating) return;
    setUpdating(true);
    window.dispatchEvent(new Event('pwa-do-update'));
  }, [updating]);

  if (!needsUpdate || dismissed) return null;

  return (
    <div
      className="w-full z-[100] flex items-center justify-between gap-3 px-4 py-2.5"
      style={{ backgroundColor: '#1E3A5F' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
        <span className="text-white text-sm font-medium truncate">
          Nueva versión disponible
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {updating ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white p-1 rounded transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
