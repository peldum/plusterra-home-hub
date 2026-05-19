import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * ClearCacheButton — Limpia Service Worker + Cache Storage + storage no crítico
 * y recarga la app. Pensado para destrabar usuarios que quedaron en una versión vieja.
 * Preserva la sesión de Supabase (sb-*) para no obligar a re-loguearse.
 */
interface Props {
  collapsed?: boolean;
}

export const ClearCacheButton = ({ collapsed }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClear = async () => {
    setBusy(true);
    try {
      // 1. Desregistrar service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      // 2. Borrar Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 3. Limpiar storage no crítico (preservar sesión Supabase)
      try {
        const preserve: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key === 'supabase.auth.token')) {
            preserve[key] = localStorage.getItem(key) || '';
          }
        }
        localStorage.clear();
        Object.entries(preserve).forEach(([k, v]) => localStorage.setItem(k, v));
        sessionStorage.clear();
      } catch {/* ignore */}

      toast.success('Caché limpiada. Recargando…');
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.location.replace(url.toString());
      }, 600);
    } catch (e: any) {
      toast.error('Error al limpiar caché: ' + (e?.message || 'desconocido'));
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {collapsed ? (
          <button
            title="Limpiar caché y recargar"
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-warning hover:bg-warning/15 transition-colors"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 rounded-lg text-sidebar-foreground/60 text-xs transition-colors hover:bg-warning/15 hover:text-warning"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Limpiar caché</span>
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Limpiar caché y recargar?</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borra la caché de la app (Service Worker + archivos guardados) y recarga la última versión publicada.
            Tu sesión se mantiene — no necesitás volver a iniciar sesión.
            <br /><br />
            Usalo si ves la app "vieja" después de una actualización o si algo se ve raro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleClear(); }} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Limpiar y recargar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};