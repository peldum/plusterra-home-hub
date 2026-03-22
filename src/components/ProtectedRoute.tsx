import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

interface ProtectedRouteProps {
  children: React.ReactNode;
  denyRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, denyRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-suspended'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('system_suspended')
        .limit(1)
        .single();
      if (error) return { system_suspended: false };
      return data as { system_suspended: boolean };
    },
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (settings?.system_suspended) {
    return (
      <div style={{ minHeight: '100vh', background: '#202124', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#5f6368" strokeWidth="2">
              <rect x="4" y="8" width="56" height="38" rx="4"/>
              <line x1="20" y1="58" x2="44" y2="58"/>
              <line x1="32" y1="46" x2="32" y2="58"/>
