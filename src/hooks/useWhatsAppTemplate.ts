import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SETTING_KEY = 'whatsapp_message_template';

const DEFAULT_TEMPLATE = `Hola {{captador_nombre}} 👋

Te consulto por la siguiente propiedad disponible:

*{{propiedad_titulo}}*

{{operacion}} – {{precio}} {{moneda}}

{{ubicacion}}

¿Sigue disponible?

¿Podrías enviarme más fotos y detalles actualizados?

Gracias.`;

export const WHATSAPP_PLACEHOLDERS = [
  { key: '{{captador_nombre}}', label: 'Nombre del captador' },
  { key: '{{propiedad_titulo}}', label: 'Título de la propiedad' },
  { key: '{{operacion}}', label: 'Tipo de operación' },
  { key: '{{precio}}', label: 'Precio' },
  { key: '{{moneda}}', label: 'Moneda' },
  { key: '{{ubicacion}}', label: 'Ubicación' },
];

export const useWhatsAppTemplate = () => {
  return useQuery({
    queryKey: ['whatsapp-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value || DEFAULT_TEMPLATE;
    },
  });
};

export const useSaveWhatsAppTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (template: string) => {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('setting_key', SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({ setting_value: template, updated_at: new Date().toISOString() })
          .eq('setting_key', SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({ setting_key: SETTING_KEY, setting_value: template });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-template'] });
      toast.success('Plantilla de WhatsApp guardada');
    },
    onError: (err: Error) => {
      toast.error('Error al guardar: ' + err.message);
    },
  });
};

export const fillWhatsAppTemplate = (
  template: string,
  data: {
    captorName: string;
    title: string;
    operation: string;
    price: string;
    currency: string;
    location: string;
  }
) => {
  return template
    .replace(/\{\{captador_nombre\}\}/g, data.captorName)
    .replace(/\{\{propiedad_titulo\}\}/g, data.title)
    .replace(/\{\{operacion\}\}/g, data.operation)
    .replace(/\{\{precio\}\}/g, data.price)
    .replace(/\{\{moneda\}\}/g, data.currency)
    .replace(/\{\{ubicacion\}\}/g, data.location);
};

export const buildWhatsAppDeepLink = (phone: string, message: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
};
