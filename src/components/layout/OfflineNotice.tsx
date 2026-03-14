import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Full-screen overlay when the browser is offline.
 * Only shown in admin panel (not portal).
 */
export const OfflineNotice = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
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
