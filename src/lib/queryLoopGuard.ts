type GuardEntry = {
  timestamps: number[];
  inFlight: Promise<Response> | null;
  lastResponse: Response | null;
  lastResponseAt: number;
};

export class QueryLoopDetectedError extends Error {
  queryKey: string;
  hits: number;
  windowMs: number;

  constructor(queryKey: string, hits: number, windowMs: number) {
    super(`[QueryLoopGuard] Loop detectado para ${queryKey} (${hits} hits en ${windowMs}ms)`);
    this.name = 'QueryLoopDetectedError';
    this.queryKey = queryKey;
    this.hits = hits;
    this.windowMs = windowMs;
  }
}

declare global {
  interface Window {
    __supabaseQueryLoopGuardInstalled?: boolean;
  }
}

const entries = new Map<string, GuardEntry>();

const isGuardedRequest = (request: Request) => {
  try {
    const url = new URL(request.url);
    const isSupabase = url.hostname.endsWith('.supabase.co');
    if (!isSupabase) return false;

    const isRestQuery = url.pathname.startsWith('/rest/v1/') && (request.method === 'GET' || request.method === 'HEAD');
    const isRpcQuery = url.pathname.startsWith('/rest/v1/rpc/') && request.method === 'POST';

    return isRestQuery || isRpcQuery;
  } catch {
    return false;
  }
};

const buildRequestKey = async (request: Request) => {
  const base = `${request.method}:${request.url}`;
  if (request.method !== 'POST') return base;

  try {
    const body = await request.clone().text();
    return `${base}:${body}`;
  } catch {
    return base;
  }
};

export const installSupabaseQueryLoopGuard = (opts?: {
  maxHits?: number;
  windowMs?: number;
  fallbackCacheMs?: number;
}) => {
  if (typeof window === 'undefined') return;
  if (window.__supabaseQueryLoopGuardInstalled) return;

  const maxHits = opts?.maxHits ?? 3;
  const windowMs = opts?.windowMs ?? 1000;
  const fallbackCacheMs = opts?.fallbackCacheMs ?? 1200;

  const originalFetch = window.fetch.bind(window);

  const guardedFetch: typeof window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (!isGuardedRequest(request)) {
      return originalFetch(input, init);
    }

    const key = await buildRequestKey(request);
    const now = Date.now();

    const entry = entries.get(key) ?? {
      timestamps: [],
      inFlight: null,
      lastResponse: null,
      lastResponseAt: 0,
    };

    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    entry.timestamps.push(now);

    if (entry.inFlight) {
      entries.set(key, entry);
      return entry.inFlight.then((response) => response.clone());
    }

    if (entry.timestamps.length > maxHits) {
      const loopError = new QueryLoopDetectedError(key, entry.timestamps.length, windowMs);

      window.dispatchEvent(
        new CustomEvent('query-loop-detected', {
          detail: {
            key,
            hits: entry.timestamps.length,
            windowMs,
            timestamp: now,
          },
        })
      );

      const hasWarmCache = entry.lastResponse && now - entry.lastResponseAt <= fallbackCacheMs;
      if (hasWarmCache) {
        entries.set(key, entry);
        return entry.lastResponse!.clone();
      }

      throw loopError;
    }

    const execution = originalFetch(request)
      .then((response) => {
        if (response.ok) {
          entry.lastResponse = response.clone();
          entry.lastResponseAt = Date.now();
        }
        return response;
      })
      .finally(() => {
        entry.inFlight = null;
      });

    entry.inFlight = execution;
    entries.set(key, entry);

    return execution.then((response) => response.clone());
  };

  window.fetch = guardedFetch;
  window.__supabaseQueryLoopGuardInstalled = true;
};
