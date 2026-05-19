// ---------------------------------------------------------------------------
// LoopSentinel — bus unificado para detección de bucles de cualquier origen
// (render, query, red, navegación). Los sensores publican aquí.
// ---------------------------------------------------------------------------

export type LoopEventType = 'render' | 'query' | 'network' | 'navigation';

export type LoopEvent = {
  type: LoopEventType;
  /** Identidad estable del recurso en bucle (componente, queryHash, URL, path). */
  identity: string;
  /** Etiqueta legible para mostrar al usuario. */
  label: string;
  /** Cantidad de hits dentro de la ventana que disparó la detección. */
  hits: number;
  /** Tamaño de ventana en ms. */
  windowMs: number;
  /** Timestamp en que se disparó la detección. */
  detectedAt: number;
  /** Datos extra opcionales (URL, stack, etc). */
  extra?: Record<string, unknown>;
};

const SESSION_KEY = 'plusterra:loop-sentinel-events';
const HISTORY_LIMIT = 100;
const FIRE_THROTTLE_MS = 4000;

type Listener = (event: LoopEvent) => void;
const listeners = new Set<Listener>();
const lastFiredByIdentity = new Map<string, number>();

const loadHistory = (): LoopEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (events: LoopEvent[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(events.slice(-HISTORY_LIMIT))
    );
  } catch { /* quota — ignore */ }
};

export const getLoopEvents = (): LoopEvent[] => loadHistory();

export const clearLoopEvents = () => {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  lastFiredByIdentity.clear();
};

export const subscribeLoopEvents = (fn: Listener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Publica un evento. Auto-throttle por identidad para no inundar. */
export const reportLoop = (event: LoopEvent) => {
  const now = Date.now();
  const key = `${event.type}::${event.identity}`;
  const last = lastFiredByIdentity.get(key) ?? 0;
  if (now - last < FIRE_THROTTLE_MS) return;
  lastFiredByIdentity.set(key, now);

  const history = loadHistory();
  history.push(event);
  persist(history);

  try {
    // eslint-disable-next-line no-console
    console.error(
      `[LoopSentinel:${event.type}] ${event.label} — hits=${event.hits}/${event.windowMs}ms`
    );
  } catch { /* ignore */ }

  for (const fn of listeners) {
    try { fn(event); } catch { /* ignore listener errors */ }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('loop-sentinel-event', { detail: event }));
    } catch { /* ignore */ }
  }
};
