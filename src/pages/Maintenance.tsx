import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Loader2, AlertTriangle, CheckCircle, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';

type MaintenanceStatus = Database['public']['Enums']['maintenance_status'];

const statusConfig: Record<MaintenanceStatus, { label: string; icon: any; class: string }> = {
  open: { label: 'Abierto', icon: AlertTriangle, class: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'En Progreso', icon: Clock, class: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'Completado', icon: CheckCircle, class: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelado', icon: AlertTriangle, class: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const priorityConfig: Record<string, { label: string; class: string }> = {
  low: { label: 'Baja', class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Media', class: 'bg-warning/10 text-warning' },
  high: { label: 'Alta', class: 'bg-destructive/10 text-destructive' },
};

const Maintenance = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['maintenance_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, properties(title, property_code), providers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: properties } = useQuery({
    queryKey: ['properties_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, title, property_code').order('title');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: providers } = useQuery({
    queryKey: ['providers_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({ description: '', property_id: '', provider_id: '', priority: 'medium', estimated_cost: 0, notes: '' });

  const createMutation = useMutation({
    mutationFn: async (input: typeof form) => {
      const { error } = await supabase.from('maintenance_tickets').insert({
        ...input,
        provider_id: input.provider_id || null,
        estimated_cost: input.estimated_cost || null,
        created_by: user!.id,
        requested_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Ticket creado'); setFormOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => {
      const updates: any = { status };
      if (status === 'completed') updates.completed_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('maintenance_tickets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_tickets'] }); toast.success('Estado actualizado'); },
  });

  const filtered = (tickets || []).filter(t => filterStatus === 'all' || t.status === filterStatus);

  return (
    <MainLayout title="Mantenimiento" subtitle={`${filtered.length} tickets`}
      action={{ label: 'Nuevo Ticket', onClick: () => { setForm({ description: '', property_id: '', provider_id: '', priority: 'medium', estimated_cost: 0, notes: '' }); setFormOpen(true); } }}>
      
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'open', label: 'Abiertos' },
          { key: 'in_progress', label: 'En Progreso' },
          { key: 'completed', label: 'Completados' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>{f.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin tickets</h3>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Descripción</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Propiedad</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Proveedor</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Prioridad</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Estado</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(ticket => {
                const sc = statusConfig[ticket.status as MaintenanceStatus] || statusConfig.open;
                const pc = priorityConfig[ticket.priority || 'medium'];
                return (
                  <tr key={ticket.id} className="table-row-hover">
                    <td className="px-6 py-4"><p className="font-medium text-foreground">{ticket.description}</p></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{(ticket as any).properties?.title || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{(ticket as any).providers?.name || '-'}</td>
                    <td className="px-6 py-4"><span className={`badge-status text-xs ${pc.class}`}>{pc.label}</span></td>
                    <td className="px-6 py-4"><span className={`badge-status text-xs border ${sc.class}`}>{sc.label}</span></td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-2 hover:bg-muted rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ticket.status === 'open' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'in_progress' })}>Marcar En Progreso</DropdownMenuItem>}
                          {ticket.status === 'in_progress' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'completed' })}>Marcar Completado</DropdownMenuItem>}
                          {ticket.status !== 'cancelled' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'cancelled' })} className="text-destructive">Cancelar</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Nuevo Ticket</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Descripción *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field min-h-[80px]" required /></div>
            <div><label className="block text-sm font-medium mb-1">Propiedad *</label>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="input-field" required>
                <option value="">Seleccionar...</option>
                {properties?.map(p => <option key={p.id} value={p.id}>{p.property_code} - {p.title}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Proveedor</label>
                <select value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))} className="input-field">
                  <option value="">Sin asignar</option>
                  {providers?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Prioridad</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field">
                  <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                </select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Costo Estimado</label>
              <input type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: +e.target.value }))} className="input-field" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Crear Ticket
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Maintenance;
