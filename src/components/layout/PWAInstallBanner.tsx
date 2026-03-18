import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPortalDomain } from '@/lib/portalDomain';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Never show on portal domain
    if (isPortalDomain()) return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      const timer = setTimeout(() => setShowModal(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowModal(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowModal(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }, []);

  if (isStandalone || !showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Instalar en {isIOS ? 'iPhone' : 'tu dispositivo'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 pb-2 space-y-4">
          {isIOS ? (
            <>
              <Step number={1}>
                <span>Tocá en </span>
                <Share className="inline w-4 h-4 text-primary mx-1 -mt-0.5" />
                <span className="font-semibold">Compartir</span>
              </Step>
              <Step number={2}>
                <span>Tocá en </span>
                <Plus className="inline w-4 h-4 text-primary mx-1 -mt-0.5" />
                <span className="font-semibold">Agregar a Inicio</span>
              </Step>
              <Step number={3}>
                <span>Tocá en </span>
                <span className="font-semibold">Agregar</span>
              </Step>
            </>
          ) : (
            <>
              <Step number={1}>
                <span>Se mostrará una ventana de instalación</span>
              </Step>
              <Step number={2}>
                <span>Tocá en </span>
                <span className="font-semibold">Instalar</span>
              </Step>
              <Step number={3}>
                <span>¡Listo! La app aparecerá en tu inicio</span>
              </Step>
            </>
          )}
        </div>

        {/* Action button */}
        <div className="p-5 pt-4">
          {isIOS ? (
            <Button
              onClick={handleDismiss}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              Entendido
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              <Download className="w-5 h-5" />
              Instalar App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Step = ({ number, children }: { number: number; children: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
      {number}
    </span>
    <p className="text-sm text-foreground">{children}</p>
  </div>
);
