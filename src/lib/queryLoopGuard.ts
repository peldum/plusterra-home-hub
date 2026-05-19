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

export class AuthExpiredError extends Error {
  constructor(message = 'JWT expired') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

declare global {
  interface Window {
    __supabaseQueryLoopGuardInstalled?: boolean;
  }
}

const entries = new Map<string, GuardEntry>();

export const resetQueryLoopGuard = () => {
  entries.clear();
};

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

const isSupabaseRestRequest = (request: Request) => {
  try {
    const url = new URL(request.url);
    return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/');
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

// 401/JWT-expired interception state
let refreshInFlight: Promise<boolean> | null = null;
let lastRefreshAt = 0;
let consecutiveRefreshFailures = 0;
const REFRESH_COOLDOWN_MS = 1500;

const tryRefreshSession = async (): Promise<boolean> => {
  const now = Date.now();
  if (refreshInFlight) return refreshInFlight;
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) return false;

  lastRefreshAt = now;
  refreshInFlight = (async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        consecutiveRefreshFailures += 1;
        if (consecutiveRefreshFailures >= 2) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
        return false;
      }
      consecutiveRefreshFailures = 0;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

const isJwtExpiredResponse = async (response: Response): Promise<boolean> => {
  if (response.status !== 401) return false;
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    return text.includes('PGRST303') || text.includes('JWT expired') || text.includes('jwt expired');
  } catch {
    return true; // assume expired on any 401 we can't parse
  }
};

export const installSupabaseQueryLoopGuard = (opts?: {
  maxHits?: number;
  windowMs?: number;
  fallbackCacheMs?: number;
}) => {
  if (typeof window === 'undefined') return;
  if (window.__supabaseQueryLoopGuardInstalled) return;

  // Thresholds tuned for SuperAdmin dashboards with many parallel queries.
  const maxHits = opts?.maxHits ?? 60;
  const windowMs = opts?.windowMs ?? 4000;
  const fallbackCacheMs = opts?.fallbackCacheMs ?? 10000;

  // Cold-start grace period: ignore loop detection for first N ms after install,
  // since hard refresh (Ctrl+F5) legitimately fires many parallel queries.
  const installedAt = Date.now();
  // Aumentado a 15s: hard-refresh con muchas queries paralelas (dashboards de
  // Gerente/SuperAdmin) puede tardar más de 8s en arrancar y disparaba falsos
  // loops infinitos.
  const COLD_START_GRACE_MS = 25000;

  const originalFetch = window.fetch.bind(window);

  // Wrap any Supabase REST request to handle 401 with refresh+retry
  const fetchWithAuthRetry = async (request: Request): Promise<Response> => {
    const response = await originalFetch(request);
    if (!isSupabaseRestRequest(request) || response.status !== 401) {
      return response;
    }

    const expired = await isJwtExpiredResponse(response);
    if (!expired) return response;

    const refreshed = await tryRefreshSession();
    if (!refreshed) {
      throw new AuthExpiredError('Sesión expirada');
    }

    // Retry once with refreshed token (Supabase client picks new token via storage)
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const retryRequest = new Request(request, {
          headers: (() => {
            const h = new Headers(request.headers);
            h.set('Authorization', `Bearer ${token}`);
            return h;
          })(),
        });
        return originalFetch(retryRequest);
      }
    } catch {
      /* fallthrough */
    }
    return originalFetch(request);
  };

  const guardedFetch: typeof window.fetch = async (input, init) => {
    const request = new Request(input, init);

    // Always intercept Supabase REST requests for auth refresh, even if not loop-guarded
    if (!isGuardedRequest(request)) {
      if (isSupabaseRestRequest(request)) {
        return fetchWithAuthRetry(request);
      }
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

    const inColdStart = now - installedAt < COLD_START_GRACE_MS;
    if (entry.timestamps.length > maxHits && !inColdStart) {
      const loopError = new QueryLoopDetectedError(key, entry.timestamps.length, windowMs);

      // Resolve which React Query queryKey is responsible (best-effort).
      let resolvedQueryKey: unknown = null;
      let resolvedHash: string | null = null;
      try {
        // Dynamic import to avoid pulling telemetry in non-app contexts.
        // Module is loaded eagerly at app boot, so this is sync in practice.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const tele = require('./queryTelemetry') as typeof import('./queryTelemetry');
        const enriched = tele.recordFetchLoop(key, entry.timestamps.length, windowMs);
        resolvedQueryKey = enriched.queryKey;
        resolvedHash = enriched.queryHash;
      } catch { /* telemetry not installed yet */ }

      window.dispatchEvent(
        new CustomEvent('query-loop-detected', {
          detail: {
            key,
            hits: entry.timestamps.length,
            windowMs,
            timestamp: now,
            queryKey: resolvedQueryKey,
            queryHash: resolvedHash,
          },
        })
      );

      const hasWarmCache = entry.lastResponse && now - entry.lastResponseAt <= fallbackCacheMs;
      if (hasWarmCache) {
        entries.set(key, entry);
        return entry.lastResponse!.clone();
      }

      // Non-breaking degradation: warn + return a safe empty payload so the UI
      // does not crash. The CustomEvent fires above for telemetry/toast.
      try {
        // eslint-disable-next-line no-console
        console.warn('[QueryLoopGuard] Loop detectado', {
          key,
          hits: entry.timestamps.length,
          windowMs,
        });
      } catch { /* ignore */ }
      void loopError; // keep type used
      const emptyBody = request.method === 'HEAD' ? null : '[]';
      const safe = new Response(emptyBody, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      entry.lastResponse = safe.clone();
      entry.lastResponseAt = Date.now();
      entries.set(key, entry);
      return safe;
    }

    const execution = fetchWithAuthRetry(request)
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
