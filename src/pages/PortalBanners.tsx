import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePortalBanners, PortalBanner } from '@/hooks/usePortalBanners';
import { supabase } from '@/integrations/supabase/client';
import { compressToWebP } from '@/lib/imageOptimizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Image, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const emptyBanner = {
  title: '',
  subtitle: '',
  image_url_webp: '',
  link_url: '',
  order_index: 0,
  is_active: true,
};

const PortalBanners = () => {
  const { banners, isLoading, create, update, remove } = usePortalBanners();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PortalBanner> | null>(null);
  const [uploading, setUploading] = useState(false);

  const openNew = () => {
    setEditing({ ...emptyBanner, order_index: banners.length });
    setOpen(true);
  };

  const openEdit = (b: PortalBanner) => {
    setEditing({ ...b });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 1600, 0.8);
      const path = `banners/banner_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setEditing(prev => prev ? { ...prev, image_url_webp: data.publicUrl } : prev);
      toast.success('Imagen subida en WebP');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!editing?.image_url_webp) {
      toast.error('Debe subir una imagen');
      return;
    }
    if (editing.id) {
      update.mutate(editing as PortalBanner & { id: string });
    } else {
      create.mutate(editing);
    }
    setOpen(false);
  };

  return (
    <MainLayout title="Portal — Banners" subtitle="Gestión del slider hero del portal público">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nuevo Banner</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : banners.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
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
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={v => update.mutate({ id: b.id, is_active: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('¿Eliminar este banner?')) remove.mutate(b.id);
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Banner' : 'Nuevo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={editing?.title ?? ''} onChange={e => setEditing(p => p ? { ...p, title: e.target.value } : p)} />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={editing?.subtitle ?? ''} onChange={e => setEditing(p => p ? { ...p, subtitle: e.target.value } : p)} />
            </div>
            <div>
              <Label>Imagen (WebP)</Label>
              {editing?.image_url_webp && (
                <img src={editing.image_url_webp} alt="Preview" className="w-full h-32 object-cover rounded mb-2" />
              )}
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</p>}
            </div>
            <div>
              <Label>URL destino (opcional)</Label>
              <Input value={editing?.link_url ?? ''} onChange={e => setEditing(p => p ? { ...p, link_url: e.target.value } : p)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Orden</Label>
                <Input type="number" value={editing?.order_index ?? 0} onChange={e => setEditing(p => p ? { ...p, order_index: parseInt(e.target.value) || 0 } : p)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editing?.is_active ?? true} onCheckedChange={v => setEditing(p => p ? { ...p, is_active: v } : p)} />
                <Label>Activo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PortalBanners;
