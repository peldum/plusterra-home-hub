import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles that are NOT allowed to access this route. Redirects to /acceso-denegado. */
  denyRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, denyRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait until role is loaded before enforcing role restrictions
  if (denyRoles && denyRoles.length > 0) {
    if (role === null) {
      // Still loading role — show spinner
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando permisos...</p>
          </div>
        </div>
      );
    }
    if (denyRoles.includes(role)) {
      return <Navigate to="/acceso-denegado" replace />;
    }
  }

  return <>{children}</>;
};
