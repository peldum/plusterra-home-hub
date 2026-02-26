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
        .select('maintenance_mode, maintenance_whatsapp, contact_phone')
        .limit(1)
        .single();
      if (error) throw error;
      return data as { maintenance_mode: boolean; maintenance_whatsapp: string; contact_phone: string | null };
    },
    staleTime: 30 * 1000,
  });

  if (data?.maintenance_mode) {
    return <PortalMaintenancePage whatsapp={data.maintenance_whatsapp || data.contact_phone || undefined} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PortalFooter />
    </div>
  );
};
