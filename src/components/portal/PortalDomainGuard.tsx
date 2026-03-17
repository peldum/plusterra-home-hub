import { Navigate, useLocation } from 'react-router-dom';

/**
 * Blocks admin routes when accessed from the portal domain.
 * Redirects to the portal home page.
 */
export const PortalDomainGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // If someone tries to access /login, /dashboard, etc. on portal domain → redirect to /
  const adminPaths = ['/login', '/propiedades', '/clientes', '/finanzas', '/contratos', '/configuracion', '/agentes'];
  const isAdminRoute = adminPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (isAdminRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
