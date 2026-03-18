import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Generates a simple session ID to group page views */
function getSessionId(): string {
  let sid = sessionStorage.getItem('pt_sid');
  if (!sid) {
    sid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('pt_sid', sid);
  }
  return sid;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Tracks portal page views via edge function (server-side geo lookup).
 * Call once inside PortalLayout.
 */
export function usePortalTracking() {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const payload = {
      page_path: location.pathname,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent.slice(0, 512),
      session_id: getSessionId(),
    };

    // Fire-and-forget to edge function
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    }).catch(() => { /* silent */ });
  }, [location.pathname, location.search]);
}
