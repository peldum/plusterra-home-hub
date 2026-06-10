import { useEffect, useRef, useState } from 'react';

/**
 * DualScrollArea — Contenedor con scroll horizontal sincronizado arriba y abajo.
 * Permite desplazar horizontalmente sin tener que bajar hasta el final de la tabla.
 * No rompe nada: el contenido sigue scrolleando como un overflow-x-auto normal.
 */
export function DualScrollArea({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const syncing = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const update = () => setContentWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    return () => ro.disconnect();
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
      <div
        ref={topRef}
        onScroll={onTopScroll}
        className="overflow-x-auto overflow-y-hidden sticky top-0 z-20 bg-card"
        style={{ height: 12 }}
        aria-hidden
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div ref={bottomRef} onScroll={onBottomScroll} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}