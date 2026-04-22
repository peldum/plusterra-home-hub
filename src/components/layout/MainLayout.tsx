import { ReactNode, useState } from 'react';
import { Search, Plus, Menu, Sun, Moon, Rocket } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyMovementsRealtime } from '@/hooks/useKeyMovementsRealtime';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NovedadesPanel } from '@/components/novedades/NovedadesPanel';
import { useUnreadAnnouncements } from '@/hooks/useAnnouncements';
import { useAuth } from '@/contexts/AuthContext';

import { useTheme } from 'next-themes';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Nodo React personalizado que reemplaza el botón de acción estándar */
  actionNode?: ReactNode;
}

interface ShellContext {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  isMobile: boolean;
}

export const MainLayout = ({ children, title, subtitle, action, actionNode }: MainLayoutProps) => {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { user, role, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;
  const realtimeKeysAllowed = authReady && (role === 'superadmin' || role === 'admin' || role === 'accounting' || role === 'secretaria');
  
  const [novedadesOpen, setNovedadesOpen] = useState(false);
  const { data: unreadUpdates = 0 } = useUnreadAnnouncements({ enabled: authReady });
  // Try to get context from AppShell; fallback gracefully
  let setMobileMenuOpen: ((v: boolean) => void) | null = null;
  try {
    const ctx = useOutletContext<ShellContext>();
    setMobileMenuOpen = ctx?.setMobileMenuOpen ?? null;
  } catch {
    // Not inside an Outlet — standalone usage
  }

  // Realtime key movement notifications for Secretaría, Admin, SuperAdmin
  useKeyMovementsRealtime({ enabled: realtimeKeysAllowed });

  return (
    <>
      <header className="sticky top-0 z-30 h-16 md:h-20 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-full items-center justify-between px-3 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none md:gap-3">
            {isMobile && setMobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="-ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl hover:bg-muted active:scale-95 transition-all touch-manipulation"
                aria-label="Abrir menú"
              >
                <Menu className="h-6 w-6 text-foreground" />
              </button>
            )}
            <div className="min-w-0 flex-1 py-2 md:flex-none md:py-0">
              <h1 className="font-display text-lg md:text-2xl font-bold text-foreground truncate leading-tight">{title}</h1>
              {subtitle && !isMobile && (
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
            {!isMobile && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-64 pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
            )}

            {/* Novedades del Sistema — visible para todos los roles */}
            <button
              onClick={() => setNovedadesOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation md:h-auto md:w-auto md:p-2"
              aria-label="Novedades del sistema"
            >
              <Rocket className="w-5 h-5" strokeWidth={1.5} />
              {unreadUpdates > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation md:h-auto md:w-auto md:p-2"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <NotificationBell />

            {/* actionNode takes precedence over action prop */}
            {actionNode ?? (action && (
              <button
                onClick={action.onClick}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 active:bg-primary/80 transition-all touch-manipulation min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-3 md:p-8 pb-safe">
        {children}
      </main>

      <NovedadesPanel open={novedadesOpen} onOpenChange={setNovedadesOpen} />
    </>
  );
};
