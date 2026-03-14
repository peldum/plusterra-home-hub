import { useState, useEffect } from 'react';

/**
 * Splash screen shown for 1.5s on first load in standalone PWA mode.
 * Only shows once per session.
 */
export const SplashScreen = () => {
  const [visible, setVisible] = useState(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (!isStandalone) return false;
    if (sessionStorage.getItem('splash-shown')) return false;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem('splash-shown', '1');
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300"
      style={{ backgroundColor: '#1E3A5F' }}
    >
      <img
        src="/logo-plusterra-white.png"
        alt="Plusterra"
        className="w-40 h-auto animate-pulse"
      />
    </div>
  );
};
