import { useState, useEffect } from 'react';

const TOTAL_DURATION = 2000;

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
    const timer = setTimeout(() => setVisible(false), TOTAL_DURATION);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes splash-phase1 {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          /* hold */
          70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          75% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          /* zoom out */
          100% { opacity: 0; transform: translate(-50%, -50%) scale(8); }
        }
        @keyframes splash-bg {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#1E3A5F',
          animation: `splash-bg ${TOTAL_DURATION}ms ease-in forwards`,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/logo-plusterra-white.png"
          alt="Plusterra"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 200,
            maxWidth: '60vw',
            height: 'auto',
            transform: 'translate(-50%, -50%) scale(0.3)',
            opacity: 0,
            animation: `splash-phase1 ${TOTAL_DURATION}ms ease-out forwards`,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
          }}
        />
      </div>
    </>
  );
};
