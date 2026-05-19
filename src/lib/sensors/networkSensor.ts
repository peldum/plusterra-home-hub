import { reportLoop } from '@/lib/loopSentinel';

// Sensor genérico de red: cuenta requests idénticos (método+URL) por ventana.
// NO bloquea — solo observa. El corte de Supabase ya lo hace queryLoopGuard.

const WINDOW_MS = 5000;
const THRESHOLD = 25;

const counters = new Map<string, number[]>();
let installed = false;

declare global {
  interface Window {
    __loopNetworkSensorInstalled?: boolean;
  }
}

export const installNetworkSensor = () => {
  if (typeof window === 'undefined') return;
  if (window.__loopNetworkSensorInstalled) return;
  if (installed) return;
  installed = true;
  window.__loopNetworkSensorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).method : 'GET') || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const key = `${method} ${url}`;
      const now = Date.now();
      const arr = (counters.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
      arr.push(now);
      counters.set(key, arr);
      if (arr.length >= THRESHOLD) {
        reportLoop({
          type: 'network',
          identity: key,
          label: `${method} ${url.length > 80 ? url.slice(0, 77) + '…' : url}`,
          hits: arr.length,
          windowMs: WINDOW_MS,
          detectedAt: now,
          extra: { url, method },
        });
      }
    } catch { /* ignore */ }
    return originalFetch(input, init);
  };
};
