import { useEffect, useRef, useState } from 'react';

/** Diferencia mínima (px) para considerar que el contenido realmente desborda. */
const OVERFLOW_ENTER = 8;
/** Histéresis: solo se apaga la barra cuando el desborde baja de este margen. */
const OVERFLOW_EXIT = 2;
/** Máximo de mediciones aplicadas en la ventana antes de congelar (anti-parpadeo). */
const MAX_UPDATES = 12;
const UPDATE_WINDOW_MS = 1000;

/**
 * DualScrollArea — Doble scroll horizontal sincronizado (arriba sticky + abajo nativo).
 * Para que el sticky funcione, el contenedor padre NO debe tener overflow-hidden.
 */
export function DualScrollArea({
  children,
  className = '',
  stickyTopOffset = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stickyTopOffset?: number;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [needsScroll, setNeedsScroll] = useState(false);
  const lastSyncFrom = useRef<{ side: 'top' | 'bottom'; at: number } | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let lastWidth = -1;
    let lastNeeds = false;
    let updates = 0;
    let windowStart = Date.now();
    let frozen = false;

    const update = () => {
      rafId = null;
      if (frozen || !bottomRef.current) return;
      const sw = bottomRef.current.scrollWidth;
      const cw = bottomRef.current.clientWidth;

      // Histéresis: evita el ciclo mostrar/ocultar (cada toggle cambia el
      // layout, lo que vuelve a disparar el ResizeObserver → parpadeo).
      const overflow = sw - cw;
      const needs = lastNeeds ? overflow > OVERFLOW_EXIT : overflow > OVERFLOW_ENTER;

      const widthChanged = Math.abs(sw - lastWidth) > 2;
      const needsChanged = needs !== lastNeeds;
      if (!widthChanged && !needsChanged) return;

      // Cortafuegos: si algo hace oscilar las medidas, congelamos el sensor.
      const now = Date.now();
      if (now - windowStart > UPDATE_WINDOW_MS) {
        windowStart = now;
        updates = 0;
      }
      updates += 1;
      if (updates > MAX_UPDATES) {
        frozen = true;
        ro.disconnect();
        return;
      }

      if (widthChanged) {
        lastWidth = sw;
        setContentWidth(sw);
      }
      if (needsChanged) {
        lastNeeds = needs;
        setNeedsScroll(needs);
      }
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(schedule);
    update();
    // Solo observamos cambios de ANCHO: la barra superior modifica la altura
    // del contenedor y observar la altura realimentaba el bucle.
    ro.observe(el, { box: 'border-box' });
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const sync = (from: 'top' | 'bottom') => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) return;
    const last = lastSyncFrom.current;
    // Si el otro lado acaba de sincronizar (<80ms), este evento es el eco.
    if (last && last.side !== from && Date.now() - last.at < 80) return;
    lastSyncFrom.current = { side: from, at: Date.now() };
    const source = from === 'top' ? top : bottom;
    const target = from === 'top' ? bottom : top;
    if (Math.abs(target.scrollLeft - source.scrollLeft) > 1) {
      target.scrollLeft = source.scrollLeft;
    }
  };
  const onTopScroll = () => sync('top');
  const onBottomScroll = () => sync('bottom');

  return (
    <div className={className}>
      {needsScroll && (
        <div
          ref={topRef}
          onScroll={onTopScroll}
          className="dual-scroll-top overflow-x-scroll overflow-y-hidden sticky z-30 bg-muted/40 border border-border rounded-md"
          style={{ height: 18, top: stickyTopOffset }}
          aria-label="Desplazar horizontalmente"
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}
      <div
        ref={bottomRef}
        onScroll={onBottomScroll}
        className="overflow-x-auto [&_>div.relative.w-full.overflow-auto]:overflow-visible"
      >
        {children}
      </div>
    </div>
  );
}