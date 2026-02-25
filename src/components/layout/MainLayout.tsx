import { ReactNode } from 'react';
import { Search, Plus, Menu, Sun, Moon } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyMovementsRealtime } from '@/hooks/useKeyMovementsRealtime';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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
  // Try to get context from AppShell; fallback gracefully
  let setMobileMenuOpen: ((v: boolean) => void) | null = null;
  try {
    const ctx = useOutletContext<ShellContext>();
    setMobileMenuOpen = ctx?.setMobileMenuOpen ?? null;
  } catch {
    // Not inside an Outlet — standalone usage
  }

  // Realtime key movement notifications for Secretaría, Admin, SuperAdmin
  useKeyMovementsRealtime();

  return (
    <>
      <header className="sticky top-0 z-30 h-16 md:h-20 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            {isMobile && setMobileMenuOpen && (
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            )}
            <div>
              <h1 className="font-display text-lg md:text-2xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
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

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <NotificationBell />

            {/* actionNode takes precedence over action prop */}
            {actionNode ?? (action && (
              <button
                onClick={action.onClick}
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8 pb-safe">
        {children}
      </main>
    </>
  );
};
