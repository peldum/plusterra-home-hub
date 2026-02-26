import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePortalSettings, PortalSettings } from '@/hooks/usePortalSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Globe, MapPin, Users, Palette, Loader2 } from 'lucide-react';

const PortalConfig = () => {
  const { settings, isLoading, update } = usePortalSettings();
  const [form, setForm] = useState<Partial<PortalSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (key: keyof PortalSettings, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const { id, ...rest } = form as any;
    update.mutate(rest);
  };

  if (isLoading) {
    return (
      <MainLayout title="Portal — Configuración" subtitle="Ajustes del portal público">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Portal — Configuración" subtitle="Ajustes del portal público de propiedades">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-primary" /> General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título del sitio</Label>
              <Input value={form.site_title ?? ''} onChange={e => set('site_title', e.target.value)} />
            </div>
            <div>
              <Label>Meta descripción</Label>
              <Textarea value={form.meta_description ?? ''} onChange={e => set('meta_description', e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Email de contacto</Label>
              <Input type="email" value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} />
            </div>
            <div>
              <Label>Teléfono de contacto</Label>
              <Input value={form.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} />
            </div>
            <div>
              <Label>URL Términos y Condiciones</Label>
              <Input value={form.terms_url ?? ''} onChange={e => set('terms_url', e.target.value)} />
            </div>
            <div>
              <Label>URL Política de Privacidad</Label>
              <Input value={form.privacy_url ?? ''} onChange={e => set('privacy_url', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Map + Agents */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-primary" /> Mapa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mostrar mapa en portal</Label>
                <Switch checked={form.show_map ?? true} onCheckedChange={v => set('show_map', v)} />
              </div>
              <div>
                <Label>Ciudad por defecto</Label>
                <Input value={form.default_city ?? ''} onChange={e => set('default_city', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Latitud</Label>
                  <Input type="number" step="any" value={form.default_lat ?? ''} onChange={e => set('default_lat', parseFloat(e.target.value) || null)} />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input type="number" step="any" value={form.default_lng ?? ''} onChange={e => set('default_lng', parseFloat(e.target.value) || null)} />
                </div>
                <div>
                  <Label>Zoom</Label>
                  <Input type="number" value={form.default_zoom ?? 13} onChange={e => set('default_zoom', parseInt(e.target.value) || 13)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" /> Agentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mostrar sección "Nuestros Agentes"</Label>
                <Switch checked={form.show_agents_section ?? true} onCheckedChange={v => set('show_agents_section', v)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4 text-primary" /> Colores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Color primario</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color ?? '#00447C'} onChange={e => set('primary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={form.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Color secundario</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.secondary_color ?? '#FC5100'} onChange={e => set('secondary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={form.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Configuración
        </Button>
      </div>
    </MainLayout>
  );
};

export default PortalConfig;
