import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Phone, Mail, Star, MoreVertical, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const categoryOptions = [
  'Plomería', 'Electricidad', 'Cerrajería', 'Pintura', 'Limpieza',
  'Albañilería', 'Jardinería', 'Aire Acondicionado', 'Mudanza', 'Otros',
];

const Providers = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      if (form.id) {
        const { id, ...rest } = form;
        const { error } = await supabase.from('providers').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('providers').insert({ ...form, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['providers'] });
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado');
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); toast.success('Proveedor eliminado'); },
  });

  const filtered = (providers || []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [form, setForm] = useState({ name: '', category: 'Plomería', phone: '', email: '', address: '', notes: '' });

  const openNew = () => { setEditing(null); setForm({ name: '', category: 'Plomería', phone: '', email: '', address: '', notes: '' }); setFormOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, category: p.category, phone: p.phone || '', email: p.email || '', address: p.address || '', notes: p.notes || '' }); setFormOpen(true); };

  return (
    <MainLayout title="Proveedores" subtitle={`${filtered.length} proveedores registrados`}
      action={{ label: 'Nuevo Proveedor', onClick: openNew }}>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre o categoría..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin proveedores</h3>
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">+ Nuevo Proveedor</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p, i) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all animate-scale-in opacity-0"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <span className="badge-status text-xs bg-info/10 text-info mt-1">{p.category}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="p-2 hover:bg-muted rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate(p.id); }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2">
                {p.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4" />{p.phone}</div>}
                {p.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4" />{p.email}</div>}
              </div>
              {(p.rating ?? 0) > 0 && (
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                  {[...Array(5)].map((_, idx) => <Star key={idx} className={`w-4 h-4 ${idx < (p.rating ?? 0) ? 'text-warning fill-warning' : 'text-muted'}`} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Teléfono</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Dirección</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field min-h-[60px]" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Providers;
