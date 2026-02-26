import { Outlet } from 'react-router-dom';
import { PortalHeader } from './PortalHeader';
import { PortalFooter } from './PortalFooter';
import { PortalMaintenancePage } from './PortalMaintenancePage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PortalLayout = () => {
  const { data } = useQuery({
    queryKey: ['portal-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('maintenance_mode, maintenance_whatsapp')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { maintenance_mode: boolean; maintenance_whatsapp: string };
    },
    staleTime: 30 * 1000,
  });

  if (data?.maintenance_mode) {
    return <PortalMaintenancePage whatsapp={data.maintenance_whatsapp || undefined} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PortalHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PortalFooter />
    </div>
  );
};
