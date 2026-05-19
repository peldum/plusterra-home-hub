import { reportLoop } from '@/lib/loopSentinel';

const WINDOW_MS = 3000;
const THRESHOLD = 12;
const PING_PONG_MIN = 8;

const timestamps: number[] = [];
const pathHistory: string[] = [];
let installed = false;

declare global {
  interface Window {
    __loopNavigationSensorInstalled?: boolean;
  }
}

const record = (path: string) => {
  const now = Date.now();
  timestamps.push(now);
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) timestamps.shift();
  pathHistory.push(path);
  if (pathHistory.length > 30) pathHistory.shift();

  if (timestamps.length >= THRESHOLD) {
    reportLoop({
      type: 'navigation',
      identity: path,
      label: `Navegación excesiva (${timestamps.length} cambios)`,
      hits: timestamps.length,
      windowMs: WINDOW_MS,
      detectedAt: now,
      extra: { path, recent: pathHistory.slice(-10) },
    });
    return;
  }

  // Ping-pong A↔B
  const recent = pathHistory.slice(-PING_PONG_MIN);
  if (recent.length >= PING_PONG_MIN) {
    const unique = new Set(recent);
    if (unique.size === 2) {
      reportLoop({
        type: 'navigation',
        identity: Array.from(unique).sort().join(' <-> '),
        label: `Ping-pong entre rutas: ${Array.from(unique).join(' ↔ ')}`,
        hits: recent.length,
        windowMs: WINDOW_MS,
        detectedAt: now,
        extra: { recent },
      });
    }
  }
};

export const installNavigationSensor = () => {
  if (typeof window === 'undefined') return;
  if (window.__loopNavigationSensorInstalled) return;
  installed = true;
  window.__loopNavigationSensorInstalled = true;

  const originalPush = window.history.pushState.bind(window.history);
  const originalReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = function (...args: Parameters<typeof originalPush>) {
    const result = originalPush(...args);
    try { record(window.location.pathname); } catch { /* ignore */ }
    return result;
  };
  window.history.replaceState = function (...args: Parameters<typeof originalReplace>) {
    const result = originalReplace(...args);
    try { record(window.location.pathname); } catch { /* ignore */ }
    return result;
  };
  window.addEventListener('popstate', () => {
    try { record(window.location.pathname); } catch { /* ignore */ }
  });

  void installed;
};
