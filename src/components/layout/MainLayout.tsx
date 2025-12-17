import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Search, Bell, Plus } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const MainLayout = ({ children, title, subtitle, action }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Main content */}
      <div className="pl-64 transition-all duration-300">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-20 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-64 pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
              </button>
              
              {/* Action button */}
              {action && (
                <button
                  onClick={action.onClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {action.label}
                </button>
              )}
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
