import { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Full-screen overlay when the browser is offline.
 * Only shown in admin panel (not portal).
 *
 * El overlay se muestra con un retardo de 2.5s y solo si la conexión sigue
 * caída: en móviles los eventos online/offline oscilan y mostrarlo al instante
 * producía un parpadeo de pantalla completa.
 */
export const OfflineNotice = () => {
  const [offline, setOffline] = useState(false);
  const offlineTimerRef = useRef<number | null>(null);
  const onlineTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = (ref: typeof offlineTimerRef) => {
      if (ref.current == null) return;
      window.clearTimeout(ref.current);
      ref.current = null;
    };
    const goOffline = () => {
      clearTimer(onlineTimerRef);
      if (offlineTimerRef.current != null) return;
      offlineTimerRef.current = window.setTimeout(() => {
        offlineTimerRef.current = null;
        if (!navigator.onLine) setOffline(true);
      }, 2500);
    };
    const goOnline = () => {
      clearTimer(offlineTimerRef);
      if (onlineTimerRef.current != null) return;
      onlineTimerRef.current = window.setTimeout(() => {
        onlineTimerRef.current = null;
        if (navigator.onLine) setOffline(false);
      }, 1500);
    };
    if (!navigator.onLine) goOffline();
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      clearTimer(offlineTimerRef);
      clearTimer(onlineTimerRef);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Sin conexión</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Los cambios se guardarán cuando vuelva la conexión
        </p>
      </div>
    </div>
  );
};
