import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandingSettings {
  brand_name: string;
  primary_color: string;
  accent_color: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
}

const defaults: BrandingSettings = {
  brand_name: 'Plusterra',
  primary_color: '#00447C',
  accent_color: '#FC5100',
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
};

export const BRANDING_QUERY_KEY = ['branding-settings'] as const;

const fetchBranding = async (): Promise<BrandingSettings> => {
  const { data, error } = await supabase
    .from('company_settings')
    .select('setting_key, setting_value');

  if (error) {
    console.warn('Error fetching branding settings:', error.message);
    return defaults;
  }

  const mapped: Record<string, string | null> = {};
  (data ?? []).forEach((row: { setting_key: string; setting_value: string | null }) => {
    mapped[row.setting_key] = row.setting_value;
  });

  return {
    brand_name: mapped.brand_name ?? defaults.brand_name,
    primary_color: mapped.primary_color ?? defaults.primary_color,
    accent_color: mapped.accent_color ?? defaults.accent_color,
    logo_light_url: mapped.logo_light_url ?? null,
    logo_dark_url: mapped.logo_dark_url ?? null,
    favicon_url: mapped.favicon_url ?? null,
  };
};

export const useBrandingSettings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Local draft, seeded from the shared cache (used by the settings form)
  const [draft, setDraft] = useState<BrandingSettings>(data ?? defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const updateSetting = async (key: string, value: string | null) => {
    const { error } = await supabase
      .from('company_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('setting_key', key);
    if (error) throw error;
  };

  const saveSettings = async (newSettings: BrandingSettings) => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting('brand_name', newSettings.brand_name),
        updateSetting('primary_color', newSettings.primary_color),
        updateSetting('accent_color', newSettings.accent_color),
        updateSetting('logo_light_url', newSettings.logo_light_url),
        updateSetting('logo_dark_url', newSettings.logo_dark_url),
        updateSetting('favicon_url', newSettings.favicon_url),
      ]);
      // Update the shared cache so Sidebar / Login refresh instantly
      queryClient.setQueryData(BRANDING_QUERY_KEY, newSettings);
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      toast.success('Configuración de branding guardada');
    } catch (err) {
      console.error('Error saving branding:', err);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File, type: 'logo_light' | 'logo_dark' | 'favicon'): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const filePath = `${type}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Error al subir el archivo');
      return null;
    }

    const { data: pub } = supabase.storage.from('branding').getPublicUrl(filePath);
    return pub.publicUrl;
  };

  return {
    settings: draft,
    setSettings: setDraft,
    loading: isLoading,
    saving,
    saveSettings,
    uploadLogo,
  };
};
