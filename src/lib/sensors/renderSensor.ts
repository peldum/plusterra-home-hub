import { useEffect, useRef } from 'react';
import { reportLoop } from '@/lib/loopSentinel';

const WINDOW_MS = 2000;
const THRESHOLD = 60; // renders en ventana antes de marcar loop

type Tracker = { timestamps: number[]; lastFired: number };
const trackers = new Map<string, Tracker>();

/**
 * Cuenta cuántas veces re-renderiza un componente. Si supera el umbral en la
 * ventana, publica un evento de loop. Llamar UNA vez por componente.
 */
export const useRenderTracker = (componentName: string) => {
  const nameRef = useRef(componentName);
  nameRef.current = componentName;

  // Ejecuta en cada render (sin deps): incrementa contador y evalúa.
  // Usamos useEffect sin deps para que corra después de cada commit.
  useEffect(() => {
    const name = nameRef.current;
    const now = Date.now();
    const t = trackers.get(name) ?? { timestamps: [], lastFired: 0 };
    t.timestamps = t.timestamps.filter((ts) => now - ts < WINDOW_MS);
    t.timestamps.push(now);
    trackers.set(name, t);

    if (t.timestamps.length >= THRESHOLD && now - t.lastFired > WINDOW_MS) {
      t.lastFired = now;
      reportLoop({
        type: 'render',
        identity: name,
        label: `Componente ${name} re-renderizando`,
        hits: t.timestamps.length,
        windowMs: WINDOW_MS,
        detectedAt: now,
      });
    }
  });
};

export const getRenderTrackerSnapshot = () => {
  const now = Date.now();
  return Array.from(trackers.entries()).map(([name, t]) => ({
    name,
    recentRenders: t.timestamps.filter((ts) => now - ts < WINDOW_MS).length,
    lastFired: t.lastFired,
  }));
};
