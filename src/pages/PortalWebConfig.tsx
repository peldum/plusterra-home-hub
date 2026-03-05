import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Save, Globe, MapPin, Users, Palette, Loader2, Layout, Layers,
  Plus, Pencil, Trash2, Image as ImageIcon, GripVertical,
  ArrowUp, ArrowDown, Eye, EyeOff, Check, Construction,
  Building2, Facebook, Instagram, BookOpen, Type, Sparkles,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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

const emptyBanner = { title: '', subtitle: '', image_url_webp: '', order_index: 0, is_active: true };

const PortalWebConfig = () => {
  const { settings, isLoading, update } = usePortalSettings();
  const { banners, isLoading: bannersLoading, create, update: updateBanner, remove } = usePortalBanners();
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const [form, setForm] = useState<Partial<PortalSettings>>({});
  const [bannerOpen, setBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<PortalBanner> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCompanyImg, setUploadingCompanyImg] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

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

  const toggleBlock = (blockId: string) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, enabled: !b.enabled } : b));
  };

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

  const updateBlockConfig = (blockId: string, key: string, value: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, [key]: value } } : b));
  };

  // ─── Banner handlers ───
  const openNewBanner = () => {
    setEditingBanner({ ...emptyBanner, order_index: banners.length });
    setBannerOpen(true);
  };
  const openEditBanner = (b: PortalBanner) => {
    setEditingBanner({ ...b });
    setBannerOpen(true);
  };
  const handleBannerUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 1600, 0.8);
      const path = `banners/banner_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp', upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setEditingBanner(prev => prev ? { ...prev, image_url_webp: data.publicUrl } : prev);
      toast.success('Imagen subida en WebP');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
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

  // ─── Logo upload handler ───
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const webpBlob = await compressToWebP(file, 600, 0.85);
      const sizeKB = (webpBlob.size / 1024).toFixed(1);
      const path = `logo/logo_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp', upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set('logo_url_webp', data.publicUrl);
      toast.success(`Logo subido en WebP (${sizeKB} KB)`);
    } catch {
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ─── Company image upload handler ───
  const handleCompanyImageUpload = async (file: File) => {
    setUploadingCompanyImg(true);
    try {
      const webpBlob = await compressToWebP(file, 1200, 0.82);
      const sizeKB = (webpBlob.size / 1024).toFixed(1);
      const path = `company/about_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp', upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      set('about_company_image_url', data.publicUrl);
      toast.success(`Imagen subida en WebP (${sizeKB} KB)`);
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploadingCompanyImg(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Portal Web" subtitle="Configurador del portal público">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <MainLayout title="Portal Web" subtitle="Configurador completo del portal público de propiedades">
      <Tabs defaultValue="template" className="max-w-5xl">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="template" className="gap-1.5"><Layout className="w-4 h-4" /> Plantilla</TabsTrigger>
          <TabsTrigger value="blocks" className="gap-1.5"><Layers className="w-4 h-4" /> Bloques</TabsTrigger>
          <TabsTrigger value="banners" className="gap-1.5"><ImageIcon className="w-4 h-4" /> Banners</TabsTrigger>
          <TabsTrigger value="showroom" className="gap-1.5"><Building2 className="w-4 h-4" /> Showroom</TabsTrigger>
          <TabsTrigger value="quiz" className="gap-1.5"><Sparkles className="w-4 h-4" /> Quiz</TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5"><Globe className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-4 h-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="typography" className="gap-1.5"><Type className="w-4 h-4" /> Tipografía</TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5"><Palette className="w-4 h-4" /> Colores</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="maintenance" className="gap-1.5"><Construction className="w-4 h-4" /> Mantenimiento</TabsTrigger>
          )}
        </TabsList>

        {/* ═══ PLANTILLA ═══ */}
        <TabsContent value="template">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATE_OPTIONS.map(t => (
              <Card
                key={t.value}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  form.active_template === t.value ? 'ring-2 ring-primary shadow-md' : ''
                }`}
                onClick={() => set('active_template', t.value)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base">{t.label}</h3>
                    {form.active_template === t.value && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </TabsContent>

        {/* ═══ BLOQUES ═══ */}
        <TabsContent value="blocks">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Secciones del Portal</CardTitle>
              <p className="text-sm text-muted-foreground">Activa, desactiva y ordena las secciones visibles.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedBlocks.map((block, idx) => {
                const meta = BLOCK_LABELS[block.id] || { label: block.id, description: '' };
                return (
                  <div
                    key={block.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      block.enabled ? 'bg-card border-border' : 'bg-muted/50 border-muted'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{meta.label}</span>
                        {block.enabled
                          ? <Eye className="w-3.5 h-3.5 text-green-600" />
                          : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveBlock(block.id, 'up')}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === sortedBlocks.length - 1} onClick={() => moveBlock(block.id, 'down')}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
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
              <Card key={block.id} className="mt-4">
                <CardHeader><CardTitle className="text-sm">Configuración: Héroe + Buscador</CardTitle></CardHeader>
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
              <Card key={block.id} className="mt-4">
                <CardHeader><CardTitle className="text-sm">Configuración: Mapa</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Mostrar clústeres</Label>
                    <Switch checked={block.config.show_clusters ?? true} onCheckedChange={v => updateBlockConfig('map', 'show_clusters', v)} />
                  </div>
                </CardContent>
              </Card>
            );
            if (block.id === 'whatsapp_cta') return (
              <Card key={block.id} className="mt-4">
                <CardHeader><CardTitle className="text-sm">Configuración: CTA WhatsApp</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Texto de la llamada a la acción</Label><Input value={block.config.text ?? ''} onChange={e => updateBlockConfig('whatsapp_cta', 'text', e.target.value)} /></div>
                  <div><Label>Número de WhatsApp (con código país)</Label><Input value={block.config.phone ?? ''} onChange={e => updateBlockConfig('whatsapp_cta', 'phone', e.target.value)} placeholder="+595981..." /></div>
                </CardContent>
              </Card>
            );
            return null;
          })}

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </TabsContent>

        {/* ═══ BANNERS ═══ */}
        <TabsContent value="banners">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Gestión del slider hero del portal público. Tamaño recomendado: 1920×640px (3:1).</p>
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
                      <TableCell className="text-muted-foreground">
                        <GripVertical className="w-4 h-4 inline mr-1" />{b.order_index}
                      </TableCell>
                      <TableCell>
                        <img src={b.image_url_webp} alt={b.title} className="w-20 h-12 object-cover rounded" />
                      </TableCell>
                      <TableCell className="font-medium">{b.title || '(sin título)'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{b.subtitle || '—'}</TableCell>
                      <TableCell>
                        <Switch checked={b.is_active} onCheckedChange={v => updateBanner.mutate({ id: b.id, is_active: v })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditBanner(b)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('¿Eliminar este banner?')) remove.mutate(b.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}</TableBody>
              </Table>
            </Card>
          )}

          <Dialog open={bannerOpen} onOpenChange={setBannerOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBanner?.id ? 'Editar Banner' : 'Nuevo Banner'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Título</Label><Input value={editingBanner?.title ?? ''} onChange={e => setEditingBanner(p => p ? { ...p, title: e.target.value } : p)} /></div>
                <div><Label>Subtítulo</Label><Input value={editingBanner?.subtitle ?? ''} onChange={e => setEditingBanner(p => p ? { ...p, subtitle: e.target.value } : p)} /></div>
                <div>
                  <Label>Imagen (1920×640px recomendado)</Label>
                  {editingBanner?.image_url_webp && (
                    <img src={editingBanner.image_url_webp} alt="Preview" className="w-full h-32 object-cover rounded mb-2" />
                  )}
                  <Input type="file" accept="image/*" disabled={uploading} onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])} />
                  {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Orden</Label><Input type="number" value={editingBanner?.order_index ?? 0} onChange={e => setEditingBanner(p => p ? { ...p, order_index: parseInt(e.target.value) || 0 } : p)} /></div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={editingBanner?.is_active ?? true} onCheckedChange={v => setEditingBanner(p => p ? { ...p, is_active: v } : p)} />
                    <Label>Activo</Label>
                  </div>
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

        {/* ═══ QUIZ ═══ */}
        <TabsContent value="quiz">
          <div className="space-y-6">
            {/* Quiz CTA Icon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Ícono del Quiz (Banner CTA)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Se muestra en la sección azul "¿No sabés qué buscar?" del portal. Si no hay imagen, se usa un emoji 🏡 por defecto.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.quiz_icon_url && (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00447C] rounded-lg">
                      <img src={form.quiz_icon_url} alt="Quiz icon" className="w-12 h-12 object-contain" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => set('quiz_icon_url', null)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Quitar imagen
                    </Button>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const webpBlob = await compressToWebP(file, 200, 0.85);
                      const path = `quiz/quiz_icon_${Date.now()}.webp`;
                      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, { contentType: 'image/webp', upsert: true });
                      if (error) throw error;
                      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
                      set('quiz_icon_url', data.publicUrl);
                      toast.success('Ícono del quiz subido');
                    } catch {
                      toast.error('Error al subir ícono');
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Quiz Step Emojis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emojis de las opciones del Quiz</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Personalizá los emojis que aparecen en cada opción del cuestionario. Podés pegar cualquier emoji o texto corto.
                </p>
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
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {step.title}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {step.options.map(opt => {
                          const currentEmoji = emojis[`${step.key}_${opt.value}`] || opt.defaultEmoji;
                          return (
                            <div key={opt.value} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card">
                              <span className="text-3xl">{currentEmoji}</span>
                              <span className="text-xs text-muted-foreground font-medium">{opt.label}</span>
                              <Input
                                className="text-center text-lg h-9 w-full"
                                value={currentEmoji}
                                onChange={e => setEmoji(step.key, opt.value, e.target.value)}
                                placeholder={opt.defaultEmoji}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ═══ GENERAL ═══ */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-primary" /> General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo upload */}
                <div>
                  <Label>Logo del Portal</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Recomendado: <strong>400×120px</strong> (horizontal). Se comprime a WebP. Se usa en cabecera, footer y favicon.
                  </p>
                  {form.logo_url_webp && (
                    <div className="mb-2 p-3 bg-muted/30 rounded-lg inline-block">
                      <img src={form.logo_url_webp} alt="Logo actual" className="h-16 object-contain" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                    />
                    {uploadingLogo && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
                <div><Label>Título del sitio</Label><Input value={form.site_title ?? ''} onChange={e => set('site_title', e.target.value)} /></div>
                <div><Label>Meta descripción</Label><Textarea value={form.meta_description ?? ''} onChange={e => set('meta_description', e.target.value)} rows={3} /></div>
                <div><Label>Email de contacto</Label><Input type="email" value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} /></div>
                <div><Label>Teléfono de contacto</Label><Input value={form.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} /></div>
                <div><Label>URL Términos y Condiciones</Label><Input value={form.terms_url ?? ''} onChange={e => set('terms_url', e.target.value)} /></div>
                <div><Label>URL Política de Privacidad</Label><Input value={form.privacy_url ?? ''} onChange={e => set('privacy_url', e.target.value)} /></div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-primary" /> Mapa</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Ciudad por defecto</Label><Input value={form.default_city ?? ''} onChange={e => set('default_city', e.target.value)} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Latitud</Label><Input type="number" step="any" value={form.default_lat ?? ''} onChange={e => set('default_lat', parseFloat(e.target.value) || null)} /></div>
                    <div><Label>Longitud</Label><Input type="number" step="any" value={form.default_lng ?? ''} onChange={e => set('default_lng', parseFloat(e.target.value) || null)} /></div>
                    <div><Label>Zoom</Label><Input type="number" value={form.default_zoom ?? 13} onChange={e => set('default_zoom', parseInt(e.target.value) || 13)} /></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4 text-primary" /> Agentes</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label>Mostrar sección "Nuestros Agentes"</Label>
                    <Switch checked={form.show_agents_section ?? true} onCheckedChange={v => set('show_agents_section', v)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="w-4 h-4 text-primary" /> Colores</CardTitle></CardHeader>
                <CardContent>
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
        </TabsContent>

        {/* ═══ EMPRESA ═══ */}
        <TabsContent value="company">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-primary" /> Nuestra Empresa
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Información que aparece en la sección "Nuestra Empresa" del portal público.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Texto descriptivo de la empresa</Label>
                  <Textarea
                    value={(form as any).about_company_text ?? ''}
                    onChange={e => set('about_company_text' as any, e.target.value)}
                    rows={6}
                    placeholder="En PLUSTERRA Inmobiliaria somos una empresa joven de Encarnación..."
                  />
                </div>
                <div>
                  <Label>Imagen de la empresa</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Recomendado: <strong>1200×600px</strong> (horizontal). Se comprime automáticamente a WebP.
                  </p>
                  {(form as any).about_company_image_url && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img src={(form as any).about_company_image_url} alt="Empresa" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCompanyImg}
                      onChange={e => e.target.files?.[0] && handleCompanyImageUpload(e.target.files[0])}
                    />
                    {uploadingCompanyImg && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
                <div>
                  <Label>Dirección de la empresa</Label>
                  <Input
                    value={(form as any).company_address ?? ''}
                    onChange={e => set('company_address' as any, e.target.value)}
                    placeholder="Avda. Irrazábal c/ ..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="w-4 h-4 text-primary" /> Contacto Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Teléfono empresa</Label>
                    <Input
                      value={(form as any).company_phone ?? ''}
                      onChange={e => set('company_phone' as any, e.target.value)}
                      placeholder="+595 71 ..."
                    />
                  </div>
                  <div>
                    <Label>Email empresa</Label>
                    <Input
                      type="email"
                      value={(form as any).company_email ?? ''}
                      onChange={e => set('company_email' as any, e.target.value)}
                      placeholder="info@plusterra.com.py"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Instagram className="w-4 h-4 text-primary" /> Redes Sociales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label>
                    <Input
                      value={(form as any).facebook_url ?? ''}
                      onChange={e => set('facebook_url' as any, e.target.value)}
                      placeholder="https://facebook.com/plusterra"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label>
                    <Input
                      value={(form as any).instagram_url ?? ''}
                      onChange={e => set('instagram_url' as any, e.target.value)}
                      placeholder="https://instagram.com/plusterra"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="w-4 h-4 text-primary" /> Blog
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activar Blog en el portal</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Muestra la sección de blog y el enlace en el menú.</p>
                    </div>
                    <Switch
                      checked={(form as any).blog_enabled ?? false}
                      onCheckedChange={v => set('blog_enabled' as any, v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </TabsContent>

        {/* ═══ MANTENIMIENTO (solo superadmin) ═══ */}
        {isSuperAdmin && (
          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Construction className="w-5 h-5 text-secondary" />
                  Modo Mantenimiento
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Activa este modo para mostrar una página de &quot;Sitio en Mantenimiento&quot; a los visitantes del portal público.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">Activar Modo Mantenimiento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      El portal mostrará una pantalla profesional de &quot;en construcción&quot; con tu branding.
                    </p>
                  </div>
                  <Switch
                    checked={(form as any).maintenance_mode ?? false}
                    onCheckedChange={v => set('maintenance_mode' as any, v)}
                  />
                </div>
                <div>
                  <Label>Número de WhatsApp para consultas</Label>
                  <Input
                    value={(form as any).maintenance_whatsapp ?? ''}
                    onChange={e => set('maintenance_whatsapp' as any, e.target.value)}
                    placeholder="+595981123456"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si lo dejás vacío, se usará el teléfono de contacto del portal como fallback.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </TabsContent>
        )}

        {/* ═══ SHOWROOM ═══ */}
        <TabsContent value="showroom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-primary" />
                Showroom de Proyectos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Muestra proyectos inmobiliarios de desarrolladoras en el portal público. Los visitantes deben dejar sus datos para acceder a planos y brochures.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Activar Showroom en el Portal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Muestra la sección &quot;Proyectos&quot; en la navegación del portal público.
                  </p>
                </div>
                <Switch
                  checked={(form as any).showroom_enabled ?? false}
                  onCheckedChange={v => set('showroom_enabled' as any, v)}
                />
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>¿Cómo funciona?</strong><br />
                  1. Activá esta opción para mostrar la sección en el portal<br />
                  2. Andá a <strong>Edificios</strong> y marcá un edificio como &quot;Showroom&quot;<br />
                  3. Completá los datos del proyecto (renders, planos, precios, brochure)<br />
                  4. Activá el switch &quot;Visible en Showroom&quot; del edificio<br /><br />
                  Los visitantes verán los renders libremente pero deberán dejar sus datos para ver planos, descargar brochures o contactar por WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </TabsContent>

        {/* ═══ TIPOGRAFÍA ═══ */}
        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" /> Fuente del título principal (Hero)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Cambia la fuente del título grande que aparece en la parte superior del portal.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={form.hero_title_font ?? 'Open Sans'} onValueChange={v => set('hero_title_font', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'Open Sans',
                    'DM Sans',
                    'Playfair Display',
                    'Montserrat',
                    'Poppins',
                    'Raleway',
                    'Roboto',
                    'Lato',
                    'Inter',
                    'Oswald',
                    'Ubuntu',
                  ].map(f => (
                    <SelectItem key={f} value={f}>
                      <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="p-4 rounded-lg bg-muted border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                <p className="text-2xl font-bold" style={{ fontFamily: `'${form.hero_title_font || 'Open Sans'}', sans-serif` }}>
                  Encontrá tu próximo hogar
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default PortalWebConfig;
