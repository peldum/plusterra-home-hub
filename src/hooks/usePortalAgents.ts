import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalAgent {
  id: string;
  agent_id: string;
  public_name: string;
  public_phone_whatsapp: string | null;
  public_email: string | null;
  public_photo_url_webp: string | null;
  bio: string | null;
  areas: string | null;
  is_featured: boolean;
}

export const usePortalAgents = () => {
  return useQuery({
    queryKey: ['portal-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_agent_profiles')
        .select('id, agent_id, public_name, public_phone_whatsapp, public_email, public_photo_url_webp, bio, areas, is_featured')
        .eq('show_in_portal', true)
        .order('is_featured', { ascending: false });
      if (error) throw error;
      return (data || []) as PortalAgent[];
    },
    staleTime: 5 * 60_000,
  });
};
