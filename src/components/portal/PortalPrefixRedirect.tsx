import { useLocation, Navigate } from 'react-router-dom';
import { isPortalDomain, portalExternalUrl } from '@/lib/portalDomain';

/**
 * On portal domain: redirects /portal/* → /* (strips prefix).
 * On admin domain: full-page redirect to external portal domain.
 * On dev: no-op (should not be rendered).
 */
export const PortalPrefixRedirect = () => {
  const location = useLocation();
  const path = location.pathname;
  const suffix = location.search + location.hash;

  if (isPortalDomain()) {
    // Strip /portal prefix and do client-side redirect
    let newPath = '/';
    if (path === '/portal' || path === '/portal/') {
      newPath = '/';
    } else if (path.startsWith('/portal/')) {
      newPath = path.slice(7); // remove '/portal'
    }
    return <Navigate to={newPath + suffix} replace />;
  }

  // Admin or other domain: redirect externally
  window.location.replace(portalExternalUrl(path + suffix));
  return null;
};
