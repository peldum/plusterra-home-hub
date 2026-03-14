import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoiceWidgetConfig {
  assistant_photo_url: string;
  assistant_name: string;
  border_color: string;
  header_color: string;
  button_text: string;
  welcome_message: string;
}

const DEFAULTS: VoiceWidgetConfig = {
  assistant_photo_url: '/valentina-avatar.jpg',
  assistant_name: 'Valentina',
  border_color: '#1E3A5F',
  header_color: '#FF6B2C',
  button_text: 'Habla con Valentina',
  welcome_message: 'Hola, soy Valentina. ¿En qué puedo ayudarte?',
};

const SETTING_KEY = 'voice_widget_config';

export const useVoiceWidgetConfig = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['voice-widget-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      if (!data?.setting_value) return DEFAULTS;
      try {
        return { ...DEFAULTS, ...JSON.parse(data.setting_value) } as VoiceWidgetConfig;
      } catch {
        return DEFAULTS;
      }
    },
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (config: VoiceWidgetConfig) => {
      const value = JSON.stringify(config);
      // Upsert: try update first, if no rows affected then insert
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ setting_key: SETTING_KEY, setting_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-widget-config'] });
      toast.success('Configuración del widget guardada');
    },
    onError: () => toast.error('Error al guardar configuración del widget'),
  });

  return {
    config: query.data || DEFAULTS,
    isLoading: query.isLoading,
    save: saveMutation,
    DEFAULTS,
  };
};
