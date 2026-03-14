import { useState, useEffect, useRef } from 'react';
import { useVoiceWidgetConfig, VoiceWidgetConfig } from '@/hooks/useVoiceWidgetConfig';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const VoiceWidgetConfigSection = () => {
  const { config, isLoading, save, DEFAULTS } = useVoiceWidgetConfig();
  const [form, setForm] = useState<VoiceWidgetConfig>(DEFAULTS);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const set = <K extends keyof VoiceWidgetConfig>(key: K, value: VoiceWidgetConfig[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 200, 0.85);
      const path = `widget/assistant_${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from('portal-assets')
        .upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set('assistant_photo_url', data.publicUrl);
      toast.success('Foto subida correctamente');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => save.mutate(form);
  const handleReset = () => setForm(DEFAULTS);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          🎙️ Personalización del widget de voz
        </CardTitle>
        <CardDescription>
          Configurá la apariencia del asistente virtual que aparece en el portal público.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="flex items-center gap-6 p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-16 h-16 rounded-full overflow-hidden"
              style={{ border: `3px solid ${form.border_color}` }}
            >
              <img
                src={form.assistant_photo_url || DEFAULTS.assistant_photo_url}
                alt={form.assistant_name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground max-w-[100px] text-center truncate">
              {form.button_text}
            </span>
          </div>
          <div className="flex-1">
            <div
              className="rounded-t-lg px-3 py-2 flex items-center gap-2"
              style={{ backgroundColor: form.header_color }}
            >
              <div
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40"
              >
                <img
                  src={form.assistant_photo_url || DEFAULTS.assistant_photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white text-sm font-bold">{form.assistant_name}</p>
                <p className="text-white/70 text-[10px]">Asistente virtual · Plusterra</p>
              </div>
            </div>
            <div className="bg-[#F8F8F8] rounded-b-lg px-3 py-3 text-xs text-gray-600">
              {form.welcome_message}
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label>Foto del asistente</Label>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full overflow-hidden shrink-0"
              style={{ border: `2px solid ${form.border_color}` }}
            >
              <img src={form.assistant_photo_url || DEFAULTS.assistant_photo_url} alt="" className="w-full h-full object-cover" />
            </div>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Cambiar foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ''; }}
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label>Nombre del asistente</Label>
          <Input value={form.assistant_name} onChange={e => set('assistant_name', e.target.value)} maxLength={30} placeholder="Valentina" />
        </div>

        {/* Border color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color del borde del círculo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.border_color}
                onChange={e => set('border_color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <Input value={form.border_color} onChange={e => set('border_color', e.target.value)} className="w-28 font-mono text-sm" />
            </div>
          </div>

          {/* Header color */}
          <div className="space-y-2">
            <Label>Color del header del panel</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.header_color}
                onChange={e => set('header_color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <Input value={form.header_color} onChange={e => set('header_color', e.target.value)} className="w-28 font-mono text-sm" />
            </div>
          </div>
        </div>

        {/* Button text */}
        <div className="space-y-2">
          <Label>Texto del botón flotante</Label>
          <Input
            value={form.button_text}
            onChange={e => set('button_text', e.target.value.slice(0, 25))}
            maxLength={25}
            placeholder="Habla con Valentina"
          />
          <p className="text-[10px] text-muted-foreground">{form.button_text.length}/25 caracteres</p>
        </div>

        {/* Welcome message */}
        <div className="space-y-2">
          <Label>Mensaje de bienvenida</Label>
          <Input
            value={form.welcome_message}
            onChange={e => set('welcome_message', e.target.value)}
            maxLength={100}
            placeholder="Hola, soy Valentina. ¿En qué puedo ayudarte?"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
          <Button variant="ghost" onClick={handleReset} size="sm">
            <RotateCcw className="w-4 h-4 mr-1" /> Restaurar valores
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceWidgetConfigSection;
