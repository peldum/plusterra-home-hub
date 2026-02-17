import { useRef, useState } from 'react';
import {
  Building2,
  Palette,
  Save,
  Upload,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import logoHorizontalDefault from '@/assets/logo-plusterra-horizontal.png';
import faviconDefault from '/favicon.png';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

export const BrandingSection = () => {
  const { settings, setSettings, loading, saving, saveSettings, uploadLogo } = useBrandingSettings();
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    type: 'logo_light' | 'logo_dark' | 'favicon'
  ) => {
    setUploading(type);
    const url = await uploadLogo(file, type);
    if (url) {
      const key = type === 'logo_light' ? 'logo_light_url' : type === 'logo_dark' ? 'logo_dark_url' : 'favicon_url';
      setSettings((prev) => ({ ...prev, [key]: url }));
    }
    setUploading(null);
  };

  const handleRemove = (type: 'logo_light_url' | 'logo_dark_url' | 'favicon_url') => {
    setSettings((prev) => ({ ...prev, [type]: null }));
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const logoLightSrc = settings.logo_light_url || logoHorizontalDefault;
  const logoDarkSrc = settings.logo_dark_url || logoHorizontalDefault;
  const faviconSrc = settings.favicon_url || faviconDefault;

  return (
    <div
      className="bg-card border border-border rounded-xl p-6 animate-slide-up opacity-0"
      style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-secondary/10">
          <Palette className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Branding</h3>
          <p className="text-sm text-muted-foreground">Personalización visual de la marca</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo uploads */}
        <div className="space-y-4">
          {/* Logo claro */}
          <div>
            <Label className="mb-2 block">Logo claro (para fondos oscuros)</Label>
            <div className="border-2 border-border rounded-lg p-4 bg-primary flex items-center justify-center relative group min-h-[80px]">
              {uploading === 'logo_light' ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <img
                  src={logoLightSrc}
                  alt="Logo claro"
                  className={`h-14 w-auto object-contain ${!settings.logo_light_url ? 'brightness-0 invert' : ''}`}
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => lightInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Cambiar
                </Button>
                {settings.logo_light_url && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove('logo_light_url')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={lightInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'logo_light');
                e.target.value = '';
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">PNG, SVG, WebP · Máx 2MB</p>
          </div>

          {/* Logo oscuro */}
          <div>
            <Label className="mb-2 block">Logo oscuro (para fondos claros)</Label>
            <div className="border-2 border-border rounded-lg p-4 bg-white flex items-center justify-center relative group min-h-[80px]">
              {uploading === 'logo_dark' ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <img src={logoDarkSrc} alt="Logo oscuro" className="h-14 w-auto object-contain" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => darkInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Cambiar
                </Button>
                {settings.logo_dark_url && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove('logo_dark_url')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={darkInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'logo_dark');
                e.target.value = '';
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">PNG, SVG, WebP · Máx 2MB</p>
          </div>

          {/* Favicon */}
          <div>
            <Label className="mb-2 block">Favicon</Label>
            <div className="border-2 border-border rounded-lg p-4 flex items-center gap-3 relative group">
              {uploading === 'favicon' ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <img src={faviconSrc} alt="Favicon" className="w-10 h-10 object-contain" />
                  <p className="text-xs text-muted-foreground">PNG, ICO · 64x64 recomendado</p>
                </>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => faviconInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Cambiar
                </Button>
                {settings.favicon_url && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove('favicon_url')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'favicon');
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Color settings */}
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Nombre de la empresa</Label>
            <Input
              value={settings.brand_name}
              onChange={(e) => setSettings((prev) => ({ ...prev, brand_name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-2 block">Color primario</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-12 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.primary_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Color de acento</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.accent_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, accent_color: e.target.value }))}
                className="w-12 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.accent_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, accent_color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Ocultar' : 'Vista previa'}
            </Button>
          </div>

          {showPreview && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Vista previa</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-display text-lg font-bold" style={{ color: settings.primary_color }}>
                  {settings.brand_name}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Botón Primario
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: settings.accent_color }}
                >
                  Botón Acento
                </button>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: settings.primary_color }} title="Primario" />
                <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: settings.accent_color }} title="Acento" />
                <div className="w-8 h-8 rounded-full border-2 border-border bg-[#F8F9FA]" title="Fondo" />
                <div className="w-8 h-8 rounded-full border-2 border-border bg-[#2D5A27]" title="Verde" />
                <div className="w-8 h-8 rounded-full border-2 border-border bg-[#FFB800]" title="Amarillo" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={() => saveSettings(settings)} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Branding
        </Button>
      </div>
    </div>
  );
};
