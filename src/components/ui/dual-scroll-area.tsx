import { useEffect, useRef, useState } from 'react';

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
  const syncing = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let lastWidth = -1;
    let lastNeeds: boolean | null = null;
    const update = () => {
      rafId = null;
      if (!bottomRef.current) return;
      const sw = bottomRef.current.scrollWidth;
      const cw = bottomRef.current.clientWidth;
      const needs = sw > cw + 1;
      if (sw !== lastWidth) {
        lastWidth = sw;
        setContentWidth(sw);
      }
      if (needs !== lastNeeds) {
        lastNeeds = needs;
        setNeedsScroll(needs);
      }
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(update);
    };
    update();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const onTopScroll = () => {
    if (syncing.current === 'bottom') { syncing.current = null; return; }
    if (!topRef.current || !bottomRef.current) return;
    syncing.current = 'top';
    bottomRef.current.scrollLeft = topRef.current.scrollLeft;
  };
  const onBottomScroll = () => {
    if (syncing.current === 'top') { syncing.current = null; return; }
    if (!topRef.current || !bottomRef.current) return;
    syncing.current = 'bottom';
    topRef.current.scrollLeft = bottomRef.current.scrollLeft;
  };

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
      <div ref={bottomRef} onScroll={onBottomScroll} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}