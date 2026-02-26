import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalBlockConfig {
  id: string;
  enabled: boolean;
  order: number;
  config: Record<string, any>;
}

export type PortalTemplate = 'classic' | 'premium' | 'map_pro';

export interface PortalSettings {
  id: string;
  site_title: string;
  meta_description: string;
  show_map: boolean;
  default_city: string;
  default_lat: number | null;
  default_lng: number | null;
  default_zoom: number;
  show_agents_section: boolean;
  default_lead_assignee_agent_id: string | null;
  primary_color: string;
  secondary_color: string;
  logo_url_webp: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  active_template: PortalTemplate;
  blocks_config: PortalBlockConfig[];
  maintenance_mode: boolean;
  maintenance_whatsapp: string;
  about_company_text: string | null;
  about_company_image_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  blog_enabled: boolean;
}

export const usePortalSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as PortalSettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<PortalSettings>) => {
      if (!query.data?.id) throw new Error('No settings found');
      const { error } = await supabase
        .from('portal_settings')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-settings'] });
      toast.success('Configuración del portal guardada');
    },
    onError: () => toast.error('Error al guardar configuración'),
  });

  return { settings: query.data, isLoading: query.isLoading, update: updateMutation };
};
