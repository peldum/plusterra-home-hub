import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
 * Tracks portal page views in portal_visits table.
 * Call once inside PortalLayout.
 */
export function usePortalTracking() {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const record = {
      page_path: location.pathname,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent.slice(0, 512),
      session_id: getSessionId(),
    };

    // Fire-and-forget insert
    supabase.from('portal_visits').insert(record as any).then(({ error }) => {
      if (error) console.warn('[Portal Tracking]', error.message);
    });
  }, [location.pathname, location.search]);
}
