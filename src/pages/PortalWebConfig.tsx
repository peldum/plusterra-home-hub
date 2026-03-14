import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePortalSettings, PortalSettings, PortalBlockConfig, PortalTemplate } from '@/hooks/usePortalSettings';
import { usePortalBanners, PortalBanner } from '@/hooks/usePortalBanners';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Save, Loader2, Layout, Layers, Plus, Pencil, Trash2,
  Image as ImageIcon, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff,
  Check, Construction, Building2, Facebook, Instagram, BookOpen,
  Type, Sparkles, Upload, Palette, Globe, Info, Mic,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import plusterraIcon from '@/assets/plusterra-icon.png';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const BLOCK_LABELS: Record<string, { label: string; description: string }> = {
  hero: { label: 'Héroe + Buscador', description: 'Sección principal con título, subtítulo y buscador' },
  banners: { label: 'Slider de Banners', description: 'Carrusel de imágenes promocionales' },
  search: { label: 'Buscador Avanzado', description: 'Barra de filtros de propiedades' },
  featured: { label: 'Propiedades Destacadas', description: 'Propiedades marcadas como destacadas' },
  listings: { label: 'Listado General', description: 'Todas las propiedades publicadas' },
  map: { label: 'Mapa Interactivo', description: 'Mapa con marcadores de propiedades' },
  agents: { label: 'Nuestros Agentes', description: 'Sección de agentes del equipo' },
  whatsapp_cta: { label: 'CTA WhatsApp', description: 'Llamada a la acción para contacto por WhatsApp' },
  footer: { label: 'Pie de Página', description: 'Footer corporativo con contacto y links' },
};

const TEMPLATE_OPTIONS: { value: PortalTemplate; label: string; description: string }[] = [
  { value: 'classic', label: 'Clásica', description: 'Buscador arriba → Propiedades → Mapa al final' },
  { value: 'premium', label: 'Premium', description: 'Héroe + Banners → Destacadas → Mapa integrado → CTA WhatsApp' },
  { value: 'map_pro', label: 'Mapa Pro', description: 'Mapa grande arriba → Listado dinámico debajo' },
];

const SECTION_COLORS = [
  { id: 'header_top', label: '① Barra Superior', defaultColor: '#003366', description: 'Franja fina con teléfono y email de contacto', emoji: '📧' },
  { id: 'header', label: '② Header / Navegación', defaultColor: '#00447C', description: 'Barra con el logo y menú: Inicio, Ventas, Alquileres…', emoji: '🧭' },
  { id: 'hero', label: '③ Héroe (Título Principal)', defaultColor: '#00447C', description: 'Sección grande con "Encontrá tu próximo hogar" y la imagen de fondo', emoji: '🏠' },
  { id: 'quiz_cta', label: '④ Sección Quiz', defaultColor: '#00447C', description: 'Bloque "¿No sabés qué buscar?" con botón naranja', emoji: '❓' },
  { id: 'footer', label: '⑤ Pie de Página (Footer)', defaultColor: '#00447C', description: 'Sección final con logo, contacto, links e "Ofertar"', emoji: '📋' },
];

const SECTION_FONTS = [
  { id: 'header', label: '🧭 Header / Navegación', description: 'Menú de navegación: Inicio, Ventas, Alquileres…', preview: 'Inicio  Ventas  Alquileres  Agentes' },
  { id: 'hero', label: '🏠 Héroe (Título Principal)', description: 'Texto grande de la sección principal', preview: 'Encontrá tu próximo hogar' },
  { id: 'listings', label: '🏘️ Tarjetas de Propiedades', description: 'Títulos y textos de las tarjetas de propiedades', preview: 'Departamento 2 dormitorios — Gs. 3.500.000' },
  { id: 'quiz_cta', label: '❓ Sección Quiz', description: 'Texto del bloque "¿No sabés qué buscar?"', preview: '¿No sabés qué buscar?' },
  { id: 'footer', label: '📋 Pie de Página (Footer)', description: 'Textos del footer: contacto, links, copyright', preview: '© 2026 Plusterra. Todos los derechos reservados.' },
];

const FONT_OPTIONS = [
  'Open Sans', 'DM Sans', 'Playfair Display', 'Montserrat', 'Poppins',
  'Raleway', 'Roboto', 'Lato', 'Inter', 'Oswald', 'Ubuntu',
];

const emptyBanner = { title: '', subtitle: '', image_url_webp: '', order_index: 0, is_active: true };

/* ═══════════════════════════════════════════
   SAVE BUTTON (reusable)
   ═══════════════════════════════════════════ */
const SaveButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <div className="flex justify-end mt-6">
    <Button onClick={onClick} disabled={loading} size="lg">
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
      Guardar Cambios
    </Button>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const PortalWebConfig = () => {
  const { settings, isLoading, update } = usePortalSettings();
  const { banners, isLoading: bannersLoading, create, update: updateBanner, remove } = usePortalBanners();
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const isAdminOrSuper = role === 'superadmin' || role === 'admin';

  const [form, setForm] = useState<Partial<PortalSettings>>({});
  const [bannerOpen, setBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<PortalBanner> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCompanyImg, setUploadingCompanyImg] = useState(false);
  const [uploadingCta, setUploadingCta] = useState(false);
  const [uploadingQuiz, setUploadingQuiz] = useState(false);
  const [widgetTipo, setWidgetTipo] = useState<string>('whatsapp');
  const [savingWidget, setSavingWidget] = useState(false);
  const ctaInputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  // Load widget_tipo from company_settings
  useEffect(() => {
    supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'widget_tipo')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.setting_value) setWidgetTipo(data.setting_value);
      });
  }, []);

  const handleWidgetToggle = async (tipo: string) => {
    setSavingWidget(true);
    const { error } = await supabase
      .from('company_settings')
      .update({ setting_value: tipo, updated_at: new Date().toISOString() })
      .eq('setting_key', 'widget_tipo');
    if (error) {
      toast.error('Error al actualizar widget');
    } else {
      setWidgetTipo(tipo);
      toast.success(`Widget cambiado a ${tipo === 'orbia' ? 'Orbia (IA)' : 'WhatsApp'}`);
    }
    setSavingWidget(false);
  };

  const set = (key: keyof PortalSettings, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const { id, ...rest } = form as any;
    update.mutate(rest);
  };

  // ─── Block management ───
  const blocks: PortalBlockConfig[] = (form.blocks_config as PortalBlockConfig[]) || [];
  const setBlocks = (newBlocks: PortalBlockConfig[]) =>
    setForm(prev => ({ ...prev, blocks_config: newBlocks }));

  const toggleBlock = (blockId: string) =>
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, enabled: !b.enabled } : b));

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(b => b.id === blockId);
    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx - 1].order;
      sorted[idx - 1].order = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx + 1].order;
      sorted[idx + 1].order = temp;
    }
    setBlocks(sorted);
  };

  const updateBlockConfig = (blockId: string, key: string, value: any) =>
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, [key]: value } } : b));

  // ─── Upload helpers ───
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const webpBlob = await compressToWebP(file, 600, 0.85);
      const sizeKB = (webpBlob.size / 1024).toFixed(1);
      const path = `logo/logo_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set('logo_url_webp', data.publicUrl);
      toast.success(`Logo subido en WebP (${sizeKB} KB)`);
    } catch { toast.error('Error al subir el logo'); }
    finally { setUploadingLogo(false); }
  };

  const handleCompanyImageUpload = async (file: File) => {
    setUploadingCompanyImg(true);
    try {
      const webpBlob = await compressToWebP(file, 1200, 0.82);
      const sizeKB = (webpBlob.size / 1024).toFixed(1);
      const path = `company/about_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set('about_company_image_url', data.publicUrl);
      toast.success(`Imagen subida en WebP (${sizeKB} KB)`);
    } catch { toast.error('Error al subir imagen'); }
    finally { setUploadingCompanyImg(false); }
  };

  const handleIconUpload = async (file: File, field: 'cta_icon_url' | 'quiz_icon_url') => {
    const setter = field === 'cta_icon_url' ? setUploadingCta : setUploadingQuiz;
    setter(true);
    try {
      const webpBlob = await compressToWebP(file, 200, 0.85);
      const path = `icons/${field}_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set(field, data.publicUrl);
      toast.success('Ícono subido');
    } catch { toast.error('Error al subir ícono'); }
    finally { setter(false); }
  };

  // ─── Banner handlers ───
  const openNewBanner = () => { setEditingBanner({ ...emptyBanner, order_index: banners.length }); setBannerOpen(true); };
  const openEditBanner = (b: PortalBanner) => { setEditingBanner({ ...b }); setBannerOpen(true); };
  const handleBannerUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 1600, 0.8);
      const path = `banners/banner_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setEditingBanner(prev => prev ? { ...prev, image_url_webp: data.publicUrl } : prev);
      toast.success('Imagen subida en WebP');
    } catch { toast.error('Error al subir imagen'); }
    finally { setUploading(false); }
  };
  const handleBannerSave = () => {
    if (!editingBanner?.image_url_webp) { toast.error('Debe subir una imagen'); return; }
    if (editingBanner.id) {
      const { id, created_at, updated_at, link_url, ...rest } = editingBanner as any;
      updateBanner.mutate({ id, ...rest });
    } else {
      const { link_url, ...rest } = editingBanner as any;
      create.mutate(rest);
    }
    setBannerOpen(false);
  };

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <MainLayout title="Portal Web" subtitle="Configurador del portal público">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Portal Web" subtitle="Configurador completo del portal público de propiedades">
      {/* Info banner */}
      <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 max-w-5xl">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Desde aquí controlás todo el portal público</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cambiá la plantilla, logos, colores de cada sección (header, footer, hero, quiz), tipografía, banners, datos de empresa y más.
            Todos los cambios se reflejan en tiempo real en tu portal.
          </p>
        </div>
      </div>

      <Tabs defaultValue="brand" className="max-w-5xl">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="brand" className="gap-1.5"><ImageIcon className="w-4 h-4" /> Marca y Logo</TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5"><Palette className="w-4 h-4" /> Colores</TabsTrigger>
          <TabsTrigger value="typography" className="gap-1.5"><Type className="w-4 h-4" /> Tipografía</TabsTrigger>
          <TabsTrigger value="sections" className="gap-1.5"><Layers className="w-4 h-4" /> Secciones</TabsTrigger>
          <TabsTrigger value="banners" className="gap-1.5"><ImageIcon className="w-4 h-4" /> Banners</TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-4 h-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="icons" className="gap-1.5"><Sparkles className="w-4 h-4" /> Íconos y Quiz</TabsTrigger>
          <TabsTrigger value="template" className="gap-1.5"><Layout className="w-4 h-4" /> Plantilla</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="advanced" className="gap-1.5"><Construction className="w-4 h-4" /> Avanzado</TabsTrigger>
          )}
        </TabsList>

        {/* ═══════════════════════════════════════════
            TAB 1: MARCA Y LOGO
            ═══════════════════════════════════════════ */}
        <TabsContent value="brand">
          <div className="space-y-6">
            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Logo del Portal
                </CardTitle>
                <CardDescription>
                  Este logo aparece en el <strong>Header (navegación)</strong> y en el <strong>Pie de Página (Footer)</strong> del portal.
                  Formato recomendado: <strong>400×120px</strong> (horizontal). Se comprime automáticamente a WebP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  {/* Current logo preview */}
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-muted-foreground font-medium">Logo actual</p>
                    <div className="p-4 bg-[#00447C] rounded-xl inline-block min-w-[160px]">
                      {form.logo_url_webp ? (
                        <img src={form.logo_url_webp} alt="Logo actual" className="h-12 object-contain mx-auto" />
                      ) : (
                        <p className="text-white/60 text-xs">Logo por defecto</p>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Vista sobre fondo azul</p>
                  </div>
                  {/* Upload */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingLogo}
                        onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                      />
                      {uploadingLogo && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                    {form.logo_url_webp && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => set('logo_url_webp', null)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar logo personalizado
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO & Site title */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Nombre y SEO del Sitio
                </CardTitle>
                <CardDescription>
                  Información que aparece en Google y en la pestaña del navegador.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título del sitio</Label>
                  <Input value={form.site_title ?? ''} onChange={e => set('site_title', e.target.value)} placeholder="Plusterra Propiedades" />
                </div>
                <div>
                  <Label>Meta descripción</Label>
                  <Textarea value={form.meta_description ?? ''} onChange={e => set('meta_description', e.target.value)} rows={3} placeholder="Inmobiliaria líder en Encarnación..." />
                  <p className="text-xs text-muted-foreground mt-1">Aparece como descripción en los resultados de Google (máx. 160 caracteres).</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  📞 Contacto del Portal
                </CardTitle>
                <CardDescription>
                  Se muestra en la <strong>barra superior</strong> del header y en el <strong>pie de página</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email de contacto</Label>
                  <Input type="email" value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} placeholder="contacto@plusterra.com.py" />
                </div>
                <div>
                  <Label>Teléfono de contacto</Label>
                  <Input value={form.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} placeholder="+595984511051" />
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

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 2: COLORES
            ═══════════════════════════════════════════ */}
        <TabsContent value="colors">
          <div className="space-y-6">
            {/* Global colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> Colores Globales
                </CardTitle>
                <CardDescription>
                  Estos colores se usan en botones, enlaces y elementos de acento en todo el portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Color Primario (botones, enlaces)</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.primary_color ?? '#00447C'} onChange={e => set('primary_color', e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border" style={{ padding: 0 }} />
                      <div className="flex-1">
                        <Input value={form.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} className="font-mono" />
                      </div>
                      <div className="w-24 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: form.primary_color ?? '#00447C' }}>
                        Ejemplo
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Color Secundario / Acento</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.secondary_color ?? '#FC5100'} onChange={e => set('secondary_color', e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border" style={{ padding: 0 }} />
                      <div className="flex-1">
                        <Input value={form.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} className="font-mono" />
                      </div>
                      <div className="w-24 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: form.secondary_color ?? '#FC5100' }}>
                        Ejemplo
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-section colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🎨 Color de Fondo por Sección
                </CardTitle>
                <CardDescription>
                  Personalizá el color de cada parte del portal de forma independiente. Hacé clic en el cuadrado de color para cambiarlo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Visual layout preview */}
                <div className="mb-6 p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">📐 Vista previa del orden de las secciones:</p>
                  <div className="space-y-1">
                    {SECTION_COLORS.map(section => {
                      const block = blocks.find(b => b.id === section.id);
                      const currentColor = block?.config?.bg_color || section.defaultColor;
                      return (
                        <div key={section.id} className="flex items-center gap-2">
                          <div className="w-full h-7 rounded flex items-center px-3" style={{ backgroundColor: currentColor }}>
                            <span className="text-white text-[11px] font-medium drop-shadow-sm">{section.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color pickers */}
                {SECTION_COLORS.map(section => {
                  const block = blocks.find(b => b.id === section.id);
                  const currentColor = block?.config?.bg_color || section.defaultColor;
                  return (
                    <div key={section.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={e => {
                          if (block) {
                            updateBlockConfig(section.id, 'bg_color', e.target.value);
                          } else {
                            const newBlock: PortalBlockConfig = { id: section.id, enabled: true, order: 99, config: { bg_color: e.target.value } };
                            setBlocks([...blocks, newBlock]);
                          }
                        }}
                        className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer flex-shrink-0"
                        style={{ padding: 0 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{section.emoji} {section.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-muted-foreground uppercase">{currentColor}</span>
                        {currentColor !== section.defaultColor && (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { if (block) updateBlockConfig(section.id, 'bg_color', section.defaultColor); }}>
                            Restaurar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 3: TIPOGRAFÍA
            ═══════════════════════════════════════════ */}
        <TabsContent value="typography">
          <div className="space-y-6">
            {/* Global font */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" /> Fuente Global del Portal
                </CardTitle>
                <CardDescription>
                  Esta fuente se aplica por defecto a <strong>todo el portal</strong>. Podés sobrescribirla por sección más abajo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={form.hero_title_font ?? 'Open Sans'} onValueChange={v => set('hero_title_font', v)}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>
                        <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-3" style={{ fontFamily: `'${form.hero_title_font || 'Open Sans'}', sans-serif` }}>
                  <p className="text-xs text-muted-foreground">Vista previa — "{form.hero_title_font || 'Open Sans'}"</p>
                  <p className="text-2xl font-bold text-foreground">Encontrá tu próximo hogar</p>
                  <p className="text-sm text-muted-foreground">Las mejores propiedades en venta y alquiler.</p>
                </div>
              </CardContent>
            </Card>

            {/* Per-section fonts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🔤 Tipografía por Sección
                </CardTitle>
                <CardDescription>
                  Opcionalmente cambiá la fuente de cada sección. Si dejás "Usar fuente global", se usará la fuente definida arriba.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {SECTION_FONTS.map(section => {
                  const block = blocks.find(b => b.id === section.id);
                  const currentFont = block?.config?.font || '';
                  const displayFont = currentFont || form.hero_title_font || 'Open Sans';

                  return (
                    <div key={section.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{section.label}</p>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                        <Select
                          value={currentFont || '__global__'}
                          onValueChange={v => {
                            const newFont = v === '__global__' ? '' : v;
                            if (block) {
                              updateBlockConfig(section.id, 'font', newFont);
                            } else {
                              const newBlock: PortalBlockConfig = { id: section.id, enabled: true, order: 99, config: { font: newFont } };
                              setBlocks([...blocks, newBlock]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global__">
                              <span className="text-muted-foreground">↩ Usar fuente global</span>
                            </SelectItem>
                            {FONT_OPTIONS.map(f => (
                              <SelectItem key={f} value={f}>
                                <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Mini preview */}
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <p className="text-sm font-medium" style={{ fontFamily: `'${displayFont}', sans-serif` }}>
                          {section.preview}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {currentFont ? `Usando: ${currentFont}` : `Usando fuente global: ${form.hero_title_font || 'Open Sans'}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 4: SECCIONES (Bloques)
            ═══════════════════════════════════════════ */}
        <TabsContent value="sections">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Secciones del Portal
                </CardTitle>
                <CardDescription>Activá, desactivá y reordená las secciones que aparecen en la página principal del portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedBlocks.map((block, idx) => {
                  const meta = BLOCK_LABELS[block.id] || { label: block.id, description: '' };
                  return (
                    <div key={block.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${block.enabled ? 'bg-card border-border' : 'bg-muted/50 border-muted'}`}>
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {block.enabled ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveBlock(block.id, 'up')}><ArrowUp className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === sortedBlocks.length - 1} onClick={() => moveBlock(block.id, 'down')}><ArrowDown className="w-3.5 h-3.5" /></Button>
                        <Switch checked={block.enabled} onCheckedChange={() => toggleBlock(block.id)} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Per-block config */}
            {sortedBlocks.filter(b => b.enabled).map(block => {
              if (block.id === 'hero') return (
                <Card key={block.id}>
                  <CardHeader><CardTitle className="text-sm">⚙️ Configuración: Héroe + Buscador</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label>Título principal</Label><Input value={block.config.title ?? ''} onChange={e => updateBlockConfig('hero', 'title', e.target.value)} /></div>
                    <div><Label>Subtítulo</Label><Input value={block.config.subtitle ?? ''} onChange={e => updateBlockConfig('hero', 'subtitle', e.target.value)} /></div>
                    <div><Label>Texto del botón</Label><Input value={block.config.cta_text ?? ''} onChange={e => updateBlockConfig('hero', 'cta_text', e.target.value)} /></div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar buscador</Label>
                      <Switch checked={block.config.show_search ?? true} onCheckedChange={v => updateBlockConfig('hero', 'show_search', v)} />
                    </div>
                  </CardContent>
                </Card>
              );
              if (block.id === 'map') return (
                <Card key={block.id}>
                  <CardHeader><CardTitle className="text-sm">⚙️ Configuración: Mapa</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between"><Label>Mostrar clústeres</Label><Switch checked={block.config.show_clusters ?? true} onCheckedChange={v => updateBlockConfig('map', 'show_clusters', v)} /></div>
                    <div><Label>Ciudad por defecto</Label><Input value={form.default_city ?? ''} onChange={e => set('default_city', e.target.value)} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Latitud</Label><Input type="number" step="any" value={form.default_lat ?? ''} onChange={e => set('default_lat', parseFloat(e.target.value) || null)} /></div>
                      <div><Label>Longitud</Label><Input type="number" step="any" value={form.default_lng ?? ''} onChange={e => set('default_lng', parseFloat(e.target.value) || null)} /></div>
                      <div><Label>Zoom</Label><Input type="number" value={form.default_zoom ?? 13} onChange={e => set('default_zoom', parseInt(e.target.value) || 13)} /></div>
                    </div>
                  </CardContent>
                </Card>
              );
              if (block.id === 'whatsapp_cta') return (
                <Card key={block.id}>
                  <CardHeader><CardTitle className="text-sm">⚙️ Configuración: CTA WhatsApp</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div><Label>Texto de la llamada a la acción</Label><Input value={block.config.text ?? ''} onChange={e => updateBlockConfig('whatsapp_cta', 'text', e.target.value)} /></div>
                    <div><Label>Número de WhatsApp (con código país)</Label><Input value={block.config.phone ?? ''} onChange={e => updateBlockConfig('whatsapp_cta', 'phone', e.target.value)} placeholder="+595981..." /></div>
                  </CardContent>
                </Card>
              );
              if (block.id === 'agents') return (
                <Card key={block.id}>
                  <CardHeader><CardTitle className="text-sm">⚙️ Configuración: Agentes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar sección "Nuestros Agentes"</Label>
                      <Switch checked={form.show_agents_section ?? true} onCheckedChange={v => set('show_agents_section', v)} />
                    </div>
                  </CardContent>
                </Card>
              );
              return null;
            })}

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 5: BANNERS
            ═══════════════════════════════════════════ */}
        <TabsContent value="banners">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Gestión del slider hero del portal público.</p>
              <p className="text-xs text-muted-foreground">Tamaño recomendado: <strong>1920×640px</strong> (3:1).</p>
            </div>
            <Button onClick={openNewBanner}><Plus className="w-4 h-4 mr-2" /> Nuevo Banner</Button>
          </div>
          {bannersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : banners.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              No hay banners creados aún.
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-24">Imagen</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Subtítulo</TableHead>
                    <TableHead className="w-20">Activo</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="text-muted-foreground"><GripVertical className="w-4 h-4 inline mr-1" />{b.order_index}</TableCell>
                      <TableCell><img src={b.image_url_webp} alt={b.title} className="w-20 h-12 object-cover rounded" /></TableCell>
                      <TableCell className="font-medium">{b.title || '(sin título)'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{b.subtitle || '—'}</TableCell>
                      <TableCell><Switch checked={b.is_active} onCheckedChange={v => updateBanner.mutate({ id: b.id, is_active: v })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditBanner(b)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar este banner?')) remove.mutate(b.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Dialog open={bannerOpen} onOpenChange={setBannerOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingBanner?.id ? 'Editar Banner' : 'Nuevo Banner'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Título</Label><Input value={editingBanner?.title ?? ''} onChange={e => setEditingBanner(p => p ? { ...p, title: e.target.value } : p)} /></div>
                <div><Label>Subtítulo</Label><Input value={editingBanner?.subtitle ?? ''} onChange={e => setEditingBanner(p => p ? { ...p, subtitle: e.target.value } : p)} /></div>
                <div>
                  <Label>Imagen (1920×640px recomendado)</Label>
                  {editingBanner?.image_url_webp && <img src={editingBanner.image_url_webp} alt="Preview" className="w-full h-32 object-cover rounded mb-2" />}
                  <Input type="file" accept="image/*" disabled={uploading} onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])} />
                  {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Orden</Label><Input type="number" value={editingBanner?.order_index ?? 0} onChange={e => setEditingBanner(p => p ? { ...p, order_index: parseInt(e.target.value) || 0 } : p)} /></div>
                  <div className="flex items-center gap-2 pt-6"><Switch checked={editingBanner?.is_active ?? true} onCheckedChange={v => setEditingBanner(p => p ? { ...p, is_active: v } : p)} /><Label>Activo</Label></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBannerOpen(false)}>Cancelar</Button>
                <Button onClick={handleBannerSave} disabled={create.isPending || updateBanner.isPending}>
                  {(create.isPending || updateBanner.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 6: EMPRESA
            ═══════════════════════════════════════════ */}
        <TabsContent value="company">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Nuestra Empresa
                </CardTitle>
                <CardDescription>Información que aparece en la sección "Nuestra Empresa" del portal público.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Texto descriptivo</Label>
                  <Textarea value={(form as any).about_company_text ?? ''} onChange={e => set('about_company_text' as any, e.target.value)} rows={6} placeholder="En PLUSTERRA Inmobiliaria somos una empresa joven..." />
                </div>
                <div>
                  <Label>Imagen de la empresa</Label>
                  <p className="text-xs text-muted-foreground mb-2">Recomendado: <strong>1200×600px</strong>. Se comprime a WebP.</p>
                  {(form as any).about_company_image_url && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img src={(form as any).about_company_image_url} alt="Empresa" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" disabled={uploadingCompanyImg} onChange={e => e.target.files?.[0] && handleCompanyImageUpload(e.target.files[0])} />
                    {uploadingCompanyImg && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
                <div>
                  <Label>Dirección de la empresa</Label>
                  <Input value={(form as any).company_address ?? ''} onChange={e => set('company_address' as any, e.target.value)} placeholder="Avda. Irrazábal c/ ..." />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">📞 Contacto Empresa</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Teléfono empresa</Label><Input value={(form as any).company_phone ?? ''} onChange={e => set('company_phone' as any, e.target.value)} placeholder="+595 71 ..." /></div>
                  <div><Label>Email empresa</Label><Input type="email" value={(form as any).company_email ?? ''} onChange={e => set('company_email' as any, e.target.value)} placeholder="info@plusterra.com.py" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Instagram className="w-4 h-4 text-primary" /> Redes Sociales</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label><Input value={(form as any).facebook_url ?? ''} onChange={e => set('facebook_url' as any, e.target.value)} placeholder="https://facebook.com/plusterra" /></div>
                  <div><Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label><Input value={(form as any).instagram_url ?? ''} onChange={e => set('instagram_url' as any, e.target.value)} placeholder="https://instagram.com/plusterra" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Blog</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activar Blog en el portal</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Muestra la sección de blog y el enlace en el menú.</p>
                    </div>
                    <Switch checked={(form as any).blog_enabled ?? false} onCheckedChange={v => set('blog_enabled' as any, v)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <SaveButton onClick={handleSave} loading={update.isPending} />
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 7: ÍCONOS Y QUIZ
            ═══════════════════════════════════════════ */}
        <TabsContent value="icons">
          <div className="space-y-6">
            {/* CTA Icon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏷️ Ícono "Oferte su inmueble" (Footer)</CardTitle>
                <CardDescription>Se muestra en el círculo del pie de página, arriba del botón "OFERTAR". PNG o WebP, 128×128px recomendado.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
                    <img src={form.cta_icon_url || plusterraIcon} alt="CTA icon" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={() => ctaInputRef.current?.click()} disabled={uploadingCta}>
                      {uploadingCta ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />} Cambiar ícono
                    </Button>
                    {form.cta_icon_url && <Button variant="ghost" size="sm" onClick={() => set('cta_icon_url', null)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar</Button>}
                  </div>
                </div>
                <input ref={ctaInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f, 'cta_icon_url'); e.target.value = ''; }} />
              </CardContent>
            </Card>

            {/* Quiz Icon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">❓ Ícono del Quiz</CardTitle>
                <CardDescription>Se muestra en la sección "¿No sabés qué buscar?" del portal. Si está vacío se usa 🏡.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-border flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
                    {form.quiz_icon_url ? <img src={form.quiz_icon_url} alt="Quiz icon" className="w-10 h-10 object-contain" /> : <span className="text-3xl">🏡</span>}
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={() => quizInputRef.current?.click()} disabled={uploadingQuiz}>
                      {uploadingQuiz ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />} Cambiar ícono
                    </Button>
                    {form.quiz_icon_url && <Button variant="ghost" size="sm" onClick={() => set('quiz_icon_url', null)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar</Button>}
                  </div>
                </div>
                <input ref={quizInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f, 'quiz_icon_url'); e.target.value = ''; }} />
              </CardContent>
            </Card>

            {/* Quiz Emojis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🎲 Emojis de las opciones del Quiz</CardTitle>
                <CardDescription>Personalizá los emojis que aparecen en cada opción del cuestionario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const quizBlock = blocks.find(b => b.id === 'quiz_cta');
                  const emojis: Record<string, string> = quizBlock?.config?.emojis || {};
                  const QUIZ_STEPS_CONFIG = [
                    { key: 'businessType', title: 'Paso 1 — Tipo de operación', options: [
                      { value: 'rent', label: 'Alquiler', defaultEmoji: '🔑' },
                      { value: 'sale', label: 'Compra', defaultEmoji: '🏠' },
                      { value: 'temporary', label: 'Temporal', defaultEmoji: '🏖️' },
                      { value: 'any', label: 'Cualquiera', defaultEmoji: '✨' },
                    ]},
                    { key: 'propertyType', title: 'Paso 2 — Tipo de propiedad', options: [
                      { value: 'apartment', label: 'Departamento', defaultEmoji: '🏢' },
                      { value: 'house', label: 'Casa', defaultEmoji: '🏡' },
                      { value: 'office', label: 'Oficina', defaultEmoji: '💼' },
                      { value: 'any', label: 'Me da igual', defaultEmoji: '🤷' },
                    ]},
                    { key: 'bedrooms', title: 'Paso 3 — Dormitorios', options: [
                      { value: '1', label: '1', defaultEmoji: '1️⃣' },
                      { value: '2', label: '2', defaultEmoji: '2️⃣' },
                      { value: '3', label: '3+', defaultEmoji: '3️⃣' },
                      { value: 'any', label: 'No importa', defaultEmoji: '🔢' },
                    ]},
                    { key: 'budget', title: 'Paso 4 — Presupuesto', options: [
                      { value: 'low', label: 'Hasta 3M', defaultEmoji: '💰' },
                      { value: 'mid', label: '3M - 8M', defaultEmoji: '💰💰' },
                      { value: 'high', label: 'Más de 8M', defaultEmoji: '💰💰💰' },
                      { value: 'any', label: 'Sin límite', defaultEmoji: '♾️' },
                    ]},
                  ];
                  const setEmoji = (stepKey: string, optValue: string, emoji: string) => {
                    const newEmojis = { ...emojis, [`${stepKey}_${optValue}`]: emoji };
                    const quizIdx = blocks.findIndex(b => b.id === 'quiz_cta');
                    if (quizIdx >= 0) {
                      const updated = [...blocks];
                      updated[quizIdx] = { ...updated[quizIdx], config: { ...updated[quizIdx].config, emojis: newEmojis } };
                      setBlocks(updated);
                    } else {
                      setBlocks([...blocks, { id: 'quiz_cta', enabled: true, order: 50, config: { emojis: newEmojis } }]);
                    }
                  };
                  return QUIZ_STEPS_CONFIG.map(step => (
                    <div key={step.key}>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" /> {step.title}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {step.options.map(opt => {
                          const currentEmoji = emojis[`${step.key}_${opt.value}`] || opt.defaultEmoji;
                          return (
                            <div key={opt.value} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card">
                              <span className="text-3xl">{currentEmoji}</span>
                              <span className="text-xs text-muted-foreground font-medium">{opt.label}</span>
                              <Input className="text-center text-lg h-9 w-full" value={currentEmoji} onChange={e => setEmoji(step.key, opt.value, e.target.value)} placeholder={opt.defaultEmoji} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 8: PLANTILLA
            ═══════════════════════════════════════════ */}
        <TabsContent value="template">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATE_OPTIONS.map(t => (
                <Card key={t.value} className={`cursor-pointer transition-all hover:shadow-md ${form.active_template === t.value ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => set('active_template', t.value)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-base">{t.label}</h3>
                      {form.active_template === t.value && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check className="w-4 h-4 text-primary-foreground" /></div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Showroom toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Showroom de Proyectos</CardTitle>
                <CardDescription>Muestra proyectos inmobiliarios de desarrolladoras en el portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">Activar Showroom en el Portal</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Muestra "Proyectos" en la navegación del portal.</p>
                  </div>
                  <Switch checked={(form as any).showroom_enabled ?? false} onCheckedChange={v => set('showroom_enabled' as any, v)} />
                </div>
              </CardContent>
            </Card>

            <SaveButton onClick={handleSave} loading={update.isPending} />
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════
            TAB 9: AVANZADO (superadmin)
            ═══════════════════════════════════════════ */}
        {isSuperAdmin && (
          <TabsContent value="advanced" className="space-y-6">
            {/* Widget de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Mic className="w-5 h-5 text-[#FF6B2C]" /> Widget de Contacto</CardTitle>
                <CardDescription>Elegí qué widget flotante se muestra en el portal público para que los visitantes se comuniquen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleWidgetToggle('whatsapp')}
                    disabled={savingWidget}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      widgetTipo === 'whatsapp'
                        ? 'border-[#25D366] bg-[#25D366]/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white flex-shrink-0">
                      <WhatsAppIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Botón clásico que abre WhatsApp con mensaje predefinido.</p>
                    </div>
                    {widgetTipo === 'whatsapp' && <Check className="w-5 h-5 text-[#25D366] ml-auto flex-shrink-0" />}
                  </button>

                  <button
                    onClick={() => handleWidgetToggle('orbia')}
                    disabled={savingWidget}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      widgetTipo === 'orbia'
                        ? 'border-[#FF6B2C] bg-[#FF6B2C]/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FF6B2C] flex items-center justify-center text-white flex-shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Orbia (IA)</p>
                      <p className="text-xs text-muted-foreground">Agente de voz con inteligencia artificial de ElevenLabs.</p>
                    </div>
                    {widgetTipo === 'orbia' && <Check className="w-5 h-5 text-[#FF6B2C] ml-auto flex-shrink-0" />}
                  </button>
                </div>
                {savingWidget && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</p>}
              </CardContent>
            </Card>

            {/* Probar webhook Orbia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Probar Webhook Orbia</CardTitle>
                <CardDescription>Envía un lead de prueba al endpoint de Orbia para verificar que funciona correctamente.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const toastId = toast.loading('Enviando lead de prueba…');
                    try {
                      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orbia-webhook`;
                      const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          nombre: 'Lead de Prueba',
                          telefono: '+595981000000',
                          consulta: 'Test automático desde panel admin',
                          fuente: 'orbia-voz',
                        }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        toast.success('✅ Webhook funcionando correctamente. Lead de prueba creado.', { id: toastId });
                      } else {
                        toast.error(`❌ Error: ${data.error || 'Respuesta inesperada'}`, { id: toastId });
                      }
                    } catch (err: any) {
                      toast.error(`❌ Error de red: ${err.message}`, { id: toastId });
                    }
                  }}
                >
                  Probar webhook Orbia
                </Button>
              </CardContent>
            </Card>

            {/* Modo Mantenimiento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Construction className="w-5 h-5 text-destructive" /> Modo Mantenimiento</CardTitle>
                <CardDescription>Activa este modo para mostrar una página de "Sitio en Mantenimiento" a los visitantes del portal público.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Activar Modo Mantenimiento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">El portal mostrará una pantalla profesional de "en construcción" con tu branding.</p>
                  </div>
                  <Switch checked={(form as any).maintenance_mode ?? false} onCheckedChange={v => set('maintenance_mode' as any, v)} />
                </div>
                <div>
                  <Label>Número de WhatsApp para consultas</Label>
                  <Input value={(form as any).maintenance_whatsapp ?? ''} onChange={e => set('maintenance_whatsapp' as any, e.target.value)} placeholder="+595981123456" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Si lo dejás vacío, se usará el teléfono de contacto del portal como fallback.</p>
                </div>
              </CardContent>
            </Card>
            <SaveButton onClick={handleSave} loading={update.isPending} />
          </TabsContent>
        )}
      </Tabs>
    </MainLayout>
  );
};

export default PortalWebConfig;
