import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Menu } from 'lucide-react';

/**
 * Persistent layout shell that keeps the Sidebar mounted across route changes.
 * This prevents logo/sidebar flickering during navigation.
 */
export const AppShell = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Sidebar />}

      {isMobile && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-screen w-64">
            <Sidebar />
          </div>
        </>
      )}

      <div className={`${isMobile ? '' : 'pl-64'} transition-all duration-300`}>
        <Outlet context={{ mobileMenuOpen, setMobileMenuOpen, isMobile }} />
      </div>
    </div>
  );
};
