/**
 * Portal domain routing helpers.
 *
 * Portal domain  : plusterra.com.py  → portal at root, admin blocked
 * Admin domain   : pluspy.app        → /portal/* redirects externally
 * Dev / preview  : everything works normally at /portal
 */

const PORTAL_DOMAIN = 'plusterra.com.py';
const ADMIN_DOMAIN = 'pluspy.app';

/** True when served from the public portal domain */
export function isPortalDomain(): boolean {
  const h = window.location.hostname.toLowerCase();
  return h === PORTAL_DOMAIN || h === `www.${PORTAL_DOMAIN}`;
}

/** True when served from the admin/internal domain */
export function isAdminDomain(): boolean {
  const h = window.location.hostname.toLowerCase();
  return h === ADMIN_DOMAIN || h === `www.${ADMIN_DOMAIN}`;
}

/** True when on a development / preview domain (localhost, lovable.app, etc.) */
export function isDevDomain(): boolean {
  return !isPortalDomain() && !isAdminDomain();
}

/**
 * Build external portal URL (always on the portal domain, without /portal prefix).
 * e.g. portalExternalUrl('/portal/propiedades/123') → 'https://plusterra.com.py/propiedades/123'
 */
export function portalExternalUrl(internalPath: string): string {
  let clean = internalPath;
  if (clean === '/portal') clean = '/';
  else if (clean.startsWith('/portal/')) clean = clean.slice(7); // remove '/portal'
  else if (clean.startsWith('/portal?')) clean = '/' + clean.slice(8);
  return `https://${PORTAL_DOMAIN}${clean}`;
}

export { PORTAL_DOMAIN, ADMIN_DOMAIN };
