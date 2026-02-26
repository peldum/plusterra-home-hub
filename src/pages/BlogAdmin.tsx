import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { compressToWebP } from '@/lib/imageOptimizer';
import { MainLayout } from '@/components/layout/MainLayout';
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
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Loader2, BookOpen, Building2, Save, Eye, Video, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  video_url: string | null;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
}

const emptyPost: Partial<BlogPost> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: null,
  video_url: null,
  author_name: 'Plusterra',
  is_published: false,
  seo_title: null,
  seo_description: null,
};

const BlogAdmin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('blog');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      if (post.id) {
        const { id, created_at, ...rest } = post as any;
        const { error } = await supabase
          .from('blog_posts')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { id, created_at, ...rest } = post as any;
        const { error } = await supabase.from('blog_posts').insert({
          ...rest,
          created_by: user?.id,
          published_at: post.is_published ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Publicación guardada');
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Publicación eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file, 1200, 0.8);
      const path = `blog/cover_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, webpBlob, {
        contentType: 'image/webp', upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setEditing(prev => prev ? { ...prev, cover_image_url: data.publicUrl } : prev);
      toast.success('Imagen subida en WebP');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (title: string, isProject: boolean) => {
    const base = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
    return isProject ? `proyecto-${base}` : base;
  };

  const openNew = (isProject: boolean) => {
    setEditing({ ...emptyPost, slug: isProject ? 'proyecto-' : '' });
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing({ ...post });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editing?.title || !editing?.slug) {
      toast.error('Título y slug son obligatorios');
      return;
    }
    if (editing.is_published && !editing.published_at) {
      editing.published_at = new Date().toISOString();
    }
    saveMutation.mutate(editing);
  };

  const blogPosts = (posts || []).filter(p => !p.slug.startsWith('proyecto-'));
  const projectPosts = (posts || []).filter(p => p.slug.startsWith('proyecto-'));

  const renderTable = (items: BlogPost[], isProject: boolean) => (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {isProject
            ? 'Los proyectos se muestran en la sección "Proyectos" del portal.'
            : 'Los artículos se muestran en la sección "Blog" del portal.'}
        </p>
        <Button onClick={() => openNew(isProject)}>
          <Plus className="w-4 h-4 mr-2" /> {isProject ? 'Nuevo Proyecto' : 'Nuevo Artículo'}
        </Button>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isProject ? <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" /> : <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />}
            No hay {isProject ? 'proyectos' : 'artículos'} creados aún.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Imagen</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead className="w-24">Video</TableHead>
                <TableHead className="w-36">Fecha</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(post => (
                <TableRow key={post.id}>
                  <TableCell>
                    {post.cover_image_url ? (
                      <img src={post.cover_image_url} alt="" className="w-16 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{post.title}</p>
                    <p className="text-xs text-muted-foreground">/{post.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.is_published ? 'default' : 'secondary'}>
                      {post.is_published ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {post.video_url ? (
                      <Badge variant="outline" className="gap-1"><Video className="w-3 h-3" /> Sí</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {post.published_at
                      ? format(new Date(post.published_at), "d MMM yyyy", { locale: es })
                      : format(new Date(post.created_at), "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('¿Eliminar esta publicación?')) deleteMutation.mutate(post.id);
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
    </>
  );

  if (isLoading) {
    return (
      <MainLayout title="Blog & Proyectos" subtitle="Gestión de contenido del portal">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Blog & Proyectos" subtitle="Gestión de contenido del portal público">
      <Tabs value={tab} onValueChange={setTab} className="max-w-5xl">
        <TabsList className="mb-6">
          <TabsTrigger value="blog" className="gap-1.5"><BookOpen className="w-4 h-4" /> Blog ({blogPosts.length})</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Building2 className="w-4 h-4" /> Proyectos ({projectPosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="blog">{renderTable(blogPosts, false)}</TabsContent>
        <TabsContent value="projects">{renderTable(projectPosts, true)}</TabsContent>
      </Tabs>

      {/* ─── Editor Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Publicación' : 'Nueva Publicación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={editing?.title ?? ''}
                  onChange={e => {
                    const title = e.target.value;
                    const isProject = editing?.slug?.startsWith('proyecto-') ?? false;
                    setEditing(prev => prev ? {
                      ...prev,
                      title,
                      slug: prev.id ? prev.slug : generateSlug(title, isProject),
                    } : prev);
                  }}
                />
              </div>
              <div className="col-span-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={editing?.slug ?? ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, slug: e.target.value } : prev)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Los slugs que inician con "proyecto-" aparecen en la sección Proyectos.
                </p>
              </div>
            </div>

            <div>
              <Label>Extracto / Resumen</Label>
              <Textarea
                value={editing?.excerpt ?? ''}
                onChange={e => setEditing(prev => prev ? { ...prev, excerpt: e.target.value } : prev)}
                rows={2}
                placeholder="Breve descripción para la tarjeta de vista previa"
              />
            </div>

            <div>
              <Label>Contenido</Label>
              <Textarea
                value={editing?.content ?? ''}
                onChange={e => setEditing(prev => prev ? { ...prev, content: e.target.value } : prev)}
                rows={8}
                placeholder="Texto completo del artículo o proyecto..."
              />
            </div>

            <div>
              <Label>Imagen de portada</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Recomendado: <strong>1200×630px</strong>. Se comprime a WebP automáticamente.
              </p>
              {editing?.cover_image_url && (
                <img src={editing.cover_image_url} alt="Portada" className="w-full h-40 object-cover rounded-lg mb-2" />
              )}
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</p>}
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><Video className="w-4 h-4" /> Video (link externo)</Label>
              <Input
                value={editing?.video_url ?? ''}
                onChange={e => setEditing(prev => prev ? { ...prev, video_url: e.target.value } : prev)}
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pegá el link de YouTube o Vimeo. No consume recursos del servidor.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Autor</Label>
                <Input
                  value={editing?.author_name ?? 'Plusterra'}
                  onChange={e => setEditing(prev => prev ? { ...prev, author_name: e.target.value } : prev)}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={editing?.is_published ?? false}
                  onCheckedChange={v => setEditing(prev => prev ? { ...prev, is_published: v } : prev)}
                />
                <Label>Publicado</Label>
              </div>
            </div>

            {/* SEO */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-muted-foreground">SEO (opcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <Label>Título SEO</Label>
                  <Input
                    value={editing?.seo_title ?? ''}
                    onChange={e => setEditing(prev => prev ? { ...prev, seo_title: e.target.value } : prev)}
                    placeholder="Máx 60 caracteres"
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label>Descripción SEO</Label>
                  <Input
                    value={editing?.seo_description ?? ''}
                    onChange={e => setEditing(prev => prev ? { ...prev, seo_description: e.target.value } : prev)}
                    placeholder="Máx 160 caracteres"
                    maxLength={160}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BlogAdmin;
