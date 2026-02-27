import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useCallback } from 'react';

/**
 * Persistent layout shell that keeps the Sidebar mounted across route changes.
 * Sidebar stays mounted on mobile (hidden via CSS transform) to prevent logo flickering.
 */
export const AppShell = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu on navigation
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: always visible. Mobile: always mounted but slides in/out */}
      {!isMobile && <Sidebar />}

      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeMobileMenu}
          />
          {/* Sidebar - always mounted, translated off-screen when closed */}
          <div
            className={`fixed left-0 top-0 z-50 h-screen w-[280px] transition-transform duration-300 ease-out will-change-transform ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onNavigate={closeMobileMenu} />
          </div>
        </>
      )}

      <div className={`${isMobile ? '' : 'pl-64'} min-h-screen`}>
        <Outlet context={{ mobileMenuOpen, setMobileMenuOpen, isMobile }} />
      </div>
    </div>
  );
};
