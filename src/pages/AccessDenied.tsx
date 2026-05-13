import { MainLayout } from '@/components/layout/MainLayout';
import { ShieldOff } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, loading } = useAuth();
  const state = location.state as { reason?: string } | null;

  if (!loading && role && state?.reason !== 'role-denied') {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout title="Acceso denegado">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Acceso denegado</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          No tenés permisos para acceder a esta sección. Contactá al administrador si creés que es un error.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Ir al inicio
        </button>
      </div>
    </MainLayout>
  );
};

export default AccessDenied;
