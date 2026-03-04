import { useRef, useState, useEffect } from 'react';
import {
  Droplets,
  Upload,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

const POSITIONS = [
  { value: 'bottom-right', label: 'Inferior derecho' },
  { value: 'bottom-left', label: 'Inferior izquierdo' },
  { value: 'center', label: 'Centro' },
  { value: 'top-right', label: 'Superior derecho' },
] as const;

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop';

export const WatermarkSection = () => {
  const { settings, isLoading, update } = usePortalSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Local state for editing
  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.3);
  const [position, setPosition] = useState<string>('bottom-right');

  // Sync from server
  useEffect(() => {
    if (settings) {
      setEnabled(settings.watermark_enabled ?? false);
      setImageUrl(settings.watermark_image_url ?? null);
      setOpacity(settings.watermark_opacity ?? 0.3);
      setPosition(settings.watermark_position ?? 'bottom-right');
    }
  }, [settings]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressToWebP(file, 800, 0.9);
      const path = `watermark_${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from('portal-assets')
        .upload(path, compressed, { upsert: true, contentType: 'image/webp' });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success('Imagen de marca de agua subida');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    update.mutate({
      watermark_enabled: enabled,
      watermark_image_url: imageUrl,
      watermark_opacity: opacity,
      watermark_position: position,
    } as any);
  };

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    width: '25%',
    maxWidth: 200,
    opacity,
    filter: 'drop-shadow(1px 1px 4px rgba(0,0,0,0.3))',
    ...(position === 'bottom-right' && { bottom: '3%', right: '3%' }),
    ...(position === 'bottom-left' && { bottom: '3%', left: '3%' }),
    ...(position === 'top-right' && { top: '3%', right: '3%' }),
    ...(position === 'center' && {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }),
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0"
      style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Droplets className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Marca de Agua
          </h3>
          <p className="text-sm text-muted-foreground">
            Se superpone en tiempo real sobre las fotos del portal público
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Activar marca de agua"
        />
      </div>

      {enabled && (
        <div className="space-y-6">
          {/* Image upload */}
          <div>
            <Label className="mb-2 block">Imagen de marca de agua</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 relative group bg-muted/30 min-h-[120px]">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : imageUrl ? (
                <>
                  <div className="bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] rounded-lg p-4">
                    <img
                      src={imageUrl}
                      alt="Marca de agua"
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Cambiar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setImageUrl(null)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Droplets className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Subí tu logo o marca de agua
                    <br />
                    <span className="text-xs">PNG con fondo transparente recomendado</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Seleccionar imagen
                  </Button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Position & Opacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Posición</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">
                Opacidad: {Math.round(opacity * 100)}%
              </Label>
              <Slider
                min={10}
                max={80}
                step={5}
                value={[Math.round(opacity * 100)]}
                onValueChange={([v]) => setOpacity(v / 100)}
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Más bajo = más sutil · Más alto = más visible
              </p>
            </div>
          </div>

          {/* Live Preview — always visible when image is set */}
          {imageUrl && (
            <div>
              <Label className="mb-2 block">Vista previa en vivo</Label>
              <div className="rounded-xl border border-border overflow-hidden relative">
                <img
                  src={SAMPLE_IMAGE}
                  alt="Preview propiedad"
                  className="w-full h-56 object-cover"
                />
                <img
                  src={imageUrl}
                  alt="Watermark preview"
                  style={positionStyle}
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                  Vista previa — así se verá en el portal
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mové el slider de opacidad o cambiá la posición para ver el resultado en tiempo real. Los cambios se aplican a <strong>todas las fotos</strong> del portal al guardar.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Marca de Agua
            </Button>
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          Activá esta opción para que todas las fotos del portal lleven tu marca de agua como capa superpuesta. Podés ajustar opacidad y posición en tiempo real.
        </p>
      )}
    </div>
  );
};
