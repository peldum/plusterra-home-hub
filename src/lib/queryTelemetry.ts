import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { reportLoop } from './loopSentinel';

// ---------------------------------------------------------------------------
// Query telemetry: traces which React Query `queryKey` is currently fetching
// so the existing fetch-level `queryLoopGuard` can resolve the *origin* of a
// loop instead of only showing the raw Supabase URL.
// ---------------------------------------------------------------------------

export type QueryKeyHit = {
  queryKey: QueryKey;
  queryHash: string;
  observers: number;
  ts: number;
};

export type QueryKeyLoopEntry = {
  queryHash: string;
  queryKey: QueryKey;
  hits: number;
  windowMs: number;
  lastUrl?: string;
  observers: number;
  detectedAt: number;
};

const RECENT_FETCH_LIMIT = 50;
const COUNTER_WINDOW_MS = 4000;
const COUNTER_THRESHOLD = 30; // refetches in window before we flag
const HISTORY_LIMIT = 200;
const SESSION_KEY = 'plusterra:query-loop-history';

const recentFetches: QueryKeyHit[] = [];
const hashToKey = new Map<string, QueryKey>();
const hashTimestamps = new Map<string, number[]>();
const flaggedRecently = new Map<string, number>(); // hash -> lastFiredAt

let installed = false;

const loadHistory = (): QueryKeyLoopEntry[] => {
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

const persistHistory = (entries: QueryKeyLoopEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(entries.slice(-HISTORY_LIMIT)));
  } catch {
    /* ignore quota errors */
  }
};

export const getQueryLoopHistory = (): QueryKeyLoopEntry[] => loadHistory();

export const clearQueryLoopHistory = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

const pushHistory = (entry: QueryKeyLoopEntry) => {
  const current = loadHistory();
  current.push(entry);
  persistHistory(current);
};

/** Returns the most recently activated queryKey (within `withinMs`). */
export const resolveActiveQueryKey = (withinMs = 1500): QueryKeyHit | null => {
  if (recentFetches.length === 0) return null;
  const now = Date.now();
  for (let i = recentFetches.length - 1; i >= 0; i--) {
    const hit = recentFetches[i];
    if (now - hit.ts <= withinMs) return hit;
  }
  return recentFetches[recentFetches.length - 1] ?? null;
};

export const installQueryTelemetry = (queryClient: QueryClient) => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const cache = queryClient.getQueryCache();

  cache.subscribe((event) => {
    // Only act on actual fetch starts to avoid double counting
    if (!event) return;
    const action = (event as { action?: { type?: string } }).action;
    if (!action || action.type !== 'fetch') return;

    const query = event.query;
    const hash = query.queryHash;
    const key = query.queryKey;
    const observers = query.getObserversCount?.() ?? 0;
    const now = Date.now();

    hashToKey.set(hash, key);

    recentFetches.push({ queryKey: key, queryHash: hash, observers, ts: now });
    if (recentFetches.length > RECENT_FETCH_LIMIT) {
      recentFetches.splice(0, recentFetches.length - RECENT_FETCH_LIMIT);
    }

    // Per-key counter (rolling window)
    const stamps = hashTimestamps.get(hash) ?? [];
    const filtered = stamps.filter((ts) => now - ts < COUNTER_WINDOW_MS);
    filtered.push(now);
    hashTimestamps.set(hash, filtered);

    if (filtered.length >= COUNTER_THRESHOLD) {
      const lastFired = flaggedRecently.get(hash) ?? 0;
      // Throttle re-flagging the same hash to once per window
      if (now - lastFired >= COUNTER_WINDOW_MS) {
        flaggedRecently.set(hash, now);
        const entry: QueryKeyLoopEntry = {
          queryHash: hash,
          queryKey: key,
          hits: filtered.length,
          windowMs: COUNTER_WINDOW_MS,
          observers,
          detectedAt: now,
        };
        pushHistory(entry);
        try {
          reportLoop({
            type: 'query',
            identity: hash,
            label: `Query ${JSON.stringify(key)}`,
            hits: filtered.length,
            windowMs: COUNTER_WINDOW_MS,
            detectedAt: now,
            extra: { queryKey: key, observers },
          });
        } catch { /* ignore */ }
        try {
          // eslint-disable-next-line no-console
          console.warn(
            `[QueryLoop] key=${JSON.stringify(key)} hits=${filtered.length}/${COUNTER_WINDOW_MS}ms observers=${observers}`
          );
        } catch { /* ignore */ }
        try {
          window.dispatchEvent(
            new CustomEvent('query-key-loop', { detail: entry })
          );
        } catch { /* ignore */ }
      }
    }
  });
};

/** Called from queryLoopGuard when a fetch-level loop is detected, to enrich
 *  the event with the queryKey responsible. */
export const recordFetchLoop = (url: string, hits: number, windowMs: number) => {
  const active = resolveActiveQueryKey(2000);
  const now = Date.now();
  const entry: QueryKeyLoopEntry = {
    queryHash: active?.queryHash ?? '(unknown)',
    queryKey: active?.queryKey ?? ['(unknown)', url],
    hits,
    windowMs,
    lastUrl: url,
    observers: active?.observers ?? 0,
    detectedAt: now,
  };
  pushHistory(entry);
  return entry;
};