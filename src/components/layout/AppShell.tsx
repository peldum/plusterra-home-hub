import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PWAInstallBanner } from './PWAInstallBanner';
import { PWAUpdateBanner } from './PWAUpdateBanner';
import { OfflineNotice } from './OfflineNotice';
import { SplashScreen } from './SplashScreen';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useCallback, useEffect } from 'react';
import { InternalAIChat } from '@/components/ai/InternalAIChat';

const TABLET_BREAKPOINT = 1024;

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w < TABLET_BREAKPOINT);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isTablet;
}

/**
 * Persistent layout shell that keeps the Sidebar mounted across route changes.
 * - Mobile (<768): sidebar hidden, opens as overlay via hamburger menu
 * - Tablet (768–1023): sidebar collapsed (icons only) with expand toggle
 * - Desktop (≥1024): sidebar full width with collapse toggle
 */
export const AppShell = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleCollapse = useCallback(() => setDesktopCollapsed(v => !v), []);

  // On tablet, default to collapsed
  const sidebarCollapsed = isTablet ? !desktopCollapsed : desktopCollapsed;

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 68 : 256; // w-[68px] or w-64

  return (
    <div className="min-h-screen bg-background" style={{ overscrollBehavior: 'none' }}>
      <SplashScreen />
      <OfflineNotice />
      <PWAUpdateBanner />

      {/* Desktop / Tablet: always visible sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      )}

      {/* Mobile: overlay sidebar */}
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeMobileMenu}
          />
          <div
            className={`fixed left-0 top-0 z-50 h-screen w-[280px] overflow-hidden transition-all duration-300 ease-out will-change-transform ${
              mobileMenuOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'
            }`}
          >
            <Sidebar onNavigate={closeMobileMenu} />
          </div>
        </>
      )}

      <div
        className="min-h-screen transition-[padding-left] duration-300"
        style={{ paddingLeft: sidebarWidth }}
      >
        <Outlet context={{ mobileMenuOpen, setMobileMenuOpen, isMobile }} />
      </div>
      <PWAInstallBanner />
      <InternalAIChat />
    </div>
  );
};
