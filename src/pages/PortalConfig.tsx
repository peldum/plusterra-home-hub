import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePortalSettings, PortalSettings } from '@/hooks/usePortalSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Globe, MapPin, Users, Palette, Loader2, Upload, Image, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import plusterraIcon from '@/assets/plusterra-icon.png';

const PortalConfig = () => {
  const { settings, isLoading, update } = usePortalSettings();
  const [form, setForm] = useState<Partial<PortalSettings>>({});
  const [uploadingCta, setUploadingCta] = useState(false);
  const [uploadingQuiz, setUploadingQuiz] = useState(false);
  const ctaInputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (key: keyof PortalSettings, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const uploadIcon = async (file: File, field: 'cta_icon_url' | 'quiz_icon_url') => {
    const setter = field === 'cta_icon_url' ? setUploadingCta : setUploadingQuiz;
    setter(true);
    const ext = file.name.split('.').pop();
    const filePath = `portal_${field}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('branding').upload(filePath, file, { upsert: true });
    if (upErr) { toast.error('Error al subir imagen'); setter(false); return; }
    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    set(field, data.publicUrl);
    setter(false);
    toast.success('Imagen subida');
  };

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

          {/* Íconos del portal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Image className="w-4 h-4 text-primary" /> Íconos del Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CTA Footer icon */}
              <div>
                <Label className="mb-2 block">Ícono "Oferte su inmueble" (footer)</Label>
                <p className="text-xs text-muted-foreground mb-2">Se muestra en el círculo del pie de página. PNG o WebP, 128x128px recomendado.</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center overflow-hidden bg-white">
                    <img src={form.cta_icon_url || plusterraIcon} alt="CTA icon" className="w-9 h-9 object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => ctaInputRef.current?.click()} disabled={uploadingCta}>
                    {uploadingCta ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Cambiar
                  </Button>
                  {form.cta_icon_url && (
                    <Button variant="ghost" size="sm" onClick={() => set('cta_icon_url', null)} className="text-destructive">
                      Quitar
                    </Button>
                  )}
                </div>
                <input ref={ctaInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadIcon(f, 'cta_icon_url'); e.target.value = ''; }} />
              </div>

              {/* Quiz icon */}
              <div>
                <Label className="mb-2 block">Ícono del Quiz (sección "¿No sabés qué buscar?")</Label>
                <p className="text-xs text-muted-foreground mb-2">Se muestra encima del título del Quiz. PNG o WebP, 128x128px recomendado. Si está vacío se usa 🏡.</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border-2 border-border flex items-center justify-center overflow-hidden bg-muted">
                    {form.quiz_icon_url ? (
                      <img src={form.quiz_icon_url} alt="Quiz icon" className="w-9 h-9 object-contain" />
                    ) : (
                      <span className="text-2xl">🏡</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => quizInputRef.current?.click()} disabled={uploadingQuiz}>
                    {uploadingQuiz ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Cambiar
                  </Button>
                  {form.quiz_icon_url && (
                    <Button variant="ghost" size="sm" onClick={() => set('quiz_icon_url', null)} className="text-destructive">
                      Quitar
                    </Button>
                  )}
                </div>
                <input ref={quizInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadIcon(f, 'quiz_icon_url'); e.target.value = ''; }} />
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
