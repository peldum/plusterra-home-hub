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
  plan_agente?: string;
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

      // Fetch plan info for premium badge
      // Plan info is not publicly accessible anymore (security fix).
      // Default all agents to 'basic' unless we add plan to portal_agent_profiles in the future.
      const planMap = new Map<string, string>();

      return (data || []).map(a => ({
        ...a,
        plan_agente: planMap.get(a.agent_id) || 'basic',
      })) as PortalAgent[];
    },
    staleTime: 5 * 60_000,
  });
};
