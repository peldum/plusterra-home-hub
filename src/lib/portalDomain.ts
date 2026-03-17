/**
 * Portal domain routing helpers.
 * 
 * When the app is accessed from the portal domain (plusterra.com.py),
 * portal routes work at root level (no /portal prefix).
 * When accessed from the admin domain (pluspy.app), /portal/* redirects
 * to the portal domain.
 */

const PORTAL_DOMAIN = 'plusterra.com.py';
const ADMIN_DOMAIN = 'pluspy.app';

/** Check if the current hostname is the portal domain */
export function isPortalDomain(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === PORTAL_DOMAIN || host === `www.${PORTAL_DOMAIN}`;
}

/** Check if the current hostname is the admin domain */
export function isAdminDomain(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === ADMIN_DOMAIN || host === `www.${ADMIN_DOMAIN}`;
}

/**
 * Convert an internal portal path to the correct href.
 * On portal domain: /portal/propiedades → /propiedades
 * On admin domain: /portal/propiedades stays as-is (or redirects)
 */
export function portalPath(path: string): string {
  if (isPortalDomain()) {
    // Strip /portal prefix
    if (path === '/portal') return '/';
    if (path.startsWith('/portal/')) return path.replace('/portal', '');
    if (path.startsWith('/portal?')) return path.replace('/portal', '/');
  }
  return path;
}

/** Get the full external URL for a portal path */
export function portalExternalUrl(path: string): string {
  const clean = path === '/portal' ? '/' : path.startsWith('/portal/') ? path.replace('/portal', '') : path.startsWith('/portal?') ? path.replace('/portal', '/') : path;
  return `https://${PORTAL_DOMAIN}${clean}`;
}

export { PORTAL_DOMAIN, ADMIN_DOMAIN };
