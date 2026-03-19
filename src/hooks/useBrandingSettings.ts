import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useBrandingSettings = () => {
  const [settings, setSettings] = useState<BrandingSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchedRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    // Only fetch once per mount to avoid loops
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.warn('Error fetching branding settings:', error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const mapped: Record<string, string | null> = {};
        data.forEach((row: { setting_key: string; setting_value: string | null }) => {
          mapped[row.setting_key] = row.setting_value;
        });
        setSettings({
          brand_name: mapped.brand_name ?? defaults.brand_name,
          primary_color: mapped.primary_color ?? defaults.primary_color,
          accent_color: mapped.accent_color ?? defaults.accent_color,
          logo_light_url: mapped.logo_light_url ?? null,
          logo_dark_url: mapped.logo_dark_url ?? null,
          favicon_url: mapped.favicon_url ?? null,
        });
      }
    } catch (err) {
      console.warn('Branding settings fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      setSettings(newSettings);
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

    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return { settings, setSettings, loading, saving, saveSettings, uploadLogo };
};
