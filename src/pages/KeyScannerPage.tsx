/**
 * KeyScannerPage — Escáner QR de retiro de llaves para Agentes Internos.
 * Vista tipo PIP (no pantalla completa), minimalista, branding Plusterra.
 * SOLO funciona para usuarios con rol 'agent'. El registro se vincula
 * siempre al usuario autenticado (nunca se puede escanear por otro agente).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { Key, ScanLine, X, AlertTriangle, Camera, ArrowLeft, Keyboard, Loader2 } from 'lucide-react';
import { Info, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoVertical from '@/assets/logo-plusterra-vertical.png';
import { MainLayout } from '@/components/layout/MainLayout';

type ScanState = 'idle' | 'scanning' | 'error';

export default function KeyScannerPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const isAgent = role === 'agent';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // state 2 = SCANNING, state 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!isAgent || !user || isStarting) return;
    setIsStarting(true);
    setErrorMsg('');

    try {
      await stopScanner();

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      setScanState('scanning');

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        disableFlip: false,
      } as const;

      const tryStart = async (source: any) => {
        await scannerRef.current!.start(
          source,
          config,
          (decodedText) => { handleScanSuccess(decodedText); },
          () => { /* per-frame failures — ignore */ },
        );
      };

      const recreateScanner = () => {
        scannerRef.current = new Html5Qrcode('qr-reader');
      };

      const startAttempts: any[] = [];
      const cams = await Html5Qrcode.getCameras().catch(() => []);

      if (cams.length > 0) {
        const rear =
          cams.find((c) => /back|rear|environment|trasera|posterior/i.test(c.label)) ||
          cams[cams.length - 1];

        startAttempts.push(rear.id);
        cams
          .filter((cam) => cam.id !== rear.id)
          .forEach((cam) => startAttempts.push(cam.id));
      }

      startAttempts.push({ facingMode: 'environment' }, { facingMode: 'user' });

      let lastError: any = null;
      for (const source of startAttempts) {
        try {
          await tryStart(source);
          return;
        } catch (attemptError: any) {
          lastError = attemptError;
          console.warn('[Scanner] camera start fallback:', attemptError?.name, attemptError?.message || attemptError);
          recreateScanner();
        }
      }

      throw lastError || new Error('No camera source could be started');
    } catch (err: any) {
      console.error('[Scanner] start error:', err);
      setScanState('error');
      const name = err?.name || '';
      const msg = String(err?.message || err || '');
      if (name === 'NotAllowedError' || /permission|denied/i.test(msg)) {
        setErrorMsg('Permiso de cámara denegado. Habilitalo en el candado del navegador y volvé a intentar. También podés ingresar el código PLT manualmente.');
      } else if (name === 'NotFoundError' || /no camera|not found/i.test(msg)) {
        setErrorMsg('No se detectó ninguna cámara en este dispositivo. Ingresá el código PLT manualmente.');
      } else if (name === 'NotReadableError' || /in use|readable/i.test(msg)) {
        setErrorMsg('La cámara está en uso por otra app. Cerrá otras aplicaciones y reintentá.');
      } else if (/secure|https/i.test(msg)) {
        setErrorMsg('La cámara requiere HTTPS. Ingresá manualmente el código PLT.');
      } else {
        setErrorMsg(`No se pudo iniciar la cámara${name ? ` (${name})` : ''}. Podés ingresar el código PLT manualmente.`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [isAgent, user, isStarting, stopScanner]);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    await stopScanner();
    setScanState('idle');

    // Validate QR format — must be our key control URL
    try {
      let propertyId: string | null = null;

      // Accept full URL: https://.../retiro-llave?property=UUID
      if (decodedText.includes('retiro-llave') || decodedText.includes('property=')) {
        const url = new URL(decodedText.startsWith('http') ? decodedText : `https://x.x${decodedText}`);
        propertyId = url.searchParams.get('property');
      }
      // Accept raw UUID (property_id directly)
      else if (/^[0-9a-f-]{36}$/i.test(decodedText.trim())) {
        propertyId = decodedText.trim();
      }

      if (!propertyId) {
        setErrorMsg('QR no válido. Escaneá el QR del panel de llaves de la propiedad.');
        setScanState('error');
        return;
      }

      // Navigate to withdrawal confirmation page
      navigate(`/retiro-llave?property=${propertyId}`);
    } catch {
      setErrorMsg('QR no reconocido. Intentá de nuevo.');
      setScanState('error');
    }
  }, [navigate, stopScanner]);

  const handleManualSubmit = useCallback(async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setLookingUp(true);
    try {
      // Accept raw UUID directly
      if (/^[0-9a-f-]{36}$/i.test(code)) {
        navigate(`/retiro-llave?property=${code}`);
        return;
      }
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('property_code', code)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error(`No se encontró la propiedad con código ${code}`);
        return;
      }
      navigate(`/retiro-llave?property=${data.id}`);
    } catch (e: any) {
      toast.error('Error buscando la propiedad: ' + (e?.message ?? 'desconocido'));
    } finally {
      setLookingUp(false);
    }
  }, [manualCode, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isAgent) {
    return (
      <MainLayout title="Retiro de Llaves">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Acceso no permitido</h1>
            <p className="text-sm text-muted-foreground">
              Esta función es exclusiva para agentes internos autenticados.
            </p>
            <button onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
              Volver al inicio
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Retiro de Llaves">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Retiro de Llaves
            </h1>
            <p className="text-xs text-muted-foreground">Escaneá el QR de la propiedad</p>
          </div>
        </div>

        {/* Tips banner — troubleshooting */}
        <details className="group rounded-xl border border-border bg-muted/40 text-sm">
          <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none select-none">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">¿No funciona el escáner?</span>
            <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>1. Cerrá y volvé a abrir la app (deslizá desde recientes).</p>
            <p>2. Verificá el permiso de cámara: tocá el candado 🔒 del navegador → Cámara → Permitir → recargá.</p>
            <p>3. Cerrá otras apps que usen la cámara (WhatsApp, cámara nativa).</p>
            <p>4. Si sigue igual, usá <b>Ingresar código manual</b> abajo con el PLT de la propiedad.</p>
            <p className="pt-1 text-foreground/80">Si nada de esto funciona, avisá para revisarlo.</p>
          </div>
        </details>

        {/* Scanner Card — PIP Style */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
          {/* Scanner viewport */}
          <div className="relative bg-black" style={{ aspectRatio: '3 / 4', maxHeight: '70vh' }}>
            {/* QR Reader target */}
            <div
              id="qr-reader"
              ref={containerRef}
              className="w-full h-full"
              style={{ minHeight: 400 }}
            />

            {/* Overlay when idle */}
            {scanState !== 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                <div className="relative">
                  <Camera className="w-14 h-14 text-white/30" />
                </div>
                <p className="text-white/60 text-sm text-center px-6">
                  {scanState === 'error' ? errorMsg : 'Presioná el botón para activar la cámara'}
                </p>
                {scanState === 'error' && (
                  <AlertTriangle className="w-5 h-5 text-destructive absolute top-3 right-3" />
                )}
              </div>
            )}

            {/* Scanning overlay — targeting frame */}
            {scanState === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Corner brackets */}
                <div className="relative w-64 h-64">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-sm" />
                  {/* Scan line animation */}
                  <div className="absolute left-2 right-2 top-0 h-0.5 bg-primary/70 animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}

            {/* Stop button */}
            {scanState === 'scanning' && (
              <button
                onClick={async () => { await stopScanner(); setScanState('idle'); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom controls */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                El QR se encuentra en la <strong>ficha de cada propiedad</strong> del sistema.
              </p>
            </div>

            {scanState !== 'scanning' ? (
              <button
                onClick={startScanner}
                disabled={isStarting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando cámara...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    {scanState === 'error' ? 'Reintentar' : 'Activar escáner'}
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Buscando QR...</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual entry fallback — always visible so agents never quedan bloqueados */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Ingreso manual</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Si la cámara no funciona, ingresá el <strong>código PLT</strong> de la propiedad (visible en la ficha).
          </p>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              placeholder="Ej: PLT-1234"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim() || lookingUp}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar'}
            </button>
          </div>
        </div>

        {/* Branding footer */}
        <div className="text-center pt-2">
          <img src={logoVertical} alt="Plusterra" className="h-8 mx-auto opacity-30" />
        </div>
      </div>

      {/* Scan line animation */}
      <style>{`
        @keyframes scan {
          0% { top: 4px; opacity: 1; }
          50% { top: calc(100% - 4px); opacity: 0.6; }
          100% { top: 4px; opacity: 1; }
        }
      `}</style>
    </MainLayout>
  );
}
