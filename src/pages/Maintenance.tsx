import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Loader2, AlertTriangle, CheckCircle, Clock, MoreVertical, Pencil, Trash2, Filter, X } from 'lucide-react';
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
  const { user, role, isAdmin } = useAuth();
  const isAgent = role === 'agent';
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['maintenance_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, properties(title, property_code, owner_id, unit_id), providers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: properties } = useQuery({
    queryKey: ['properties_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, title, property_code, owner_id, unit_id').order('title');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: owners } = useQuery({
    queryKey: ['owners_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('id, full_name').order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('buildings').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, building_id').order('unit_code');
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
  const [formOwnerFilter, setFormOwnerFilter] = useState<string>('all');

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

  // Build a set of unit IDs belonging to selected building
  const buildingUnitIds = new Set(
    filterBuilding !== 'all' ? (units || []).filter(u => u.building_id === filterBuilding).map(u => u.id) : []
  );

  const filtered = (tickets || []).filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterProperty !== 'all' && t.property_id !== filterProperty) return false;
    if (filterOwner !== 'all') {
      const prop = (t as any).properties;
      if (!prop || prop.owner_id !== filterOwner) return false;
    }
    if (filterBuilding !== 'all') {
      const prop = (t as any).properties;
      if (!prop || !prop.unit_id || !buildingUnitIds.has(prop.unit_id)) return false;
    }
    return true;
  });

  const activeFilterCount = [filterPriority, filterProperty, filterOwner, filterBuilding].filter(v => v !== 'all').length;

  const clearAllFilters = () => {
    setFilterPriority('all');
    setFilterProperty('all');
    setFilterOwner('all');
    setFilterBuilding('all');
  };

  return (
    <MainLayout title="Mantenimiento" subtitle={`${filtered.length} tickets`}
      action={!isAgent ? { label: 'Nuevo Ticket', onClick: () => { setForm({ description: '', property_id: '', provider_id: '', priority: 'medium', estimated_cost: 0, notes: '' }); setFormOwnerFilter('all'); setFormOpen(true); } } : undefined}>
      
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">Filtros avanzados</span>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridad</label>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todas</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Propiedad</label>
              <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todas</option>
                {properties?.map(p => <option key={p.id} value={p.id}>{p.property_code} - {p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Propietario</label>
              <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todos</option>
                {owners?.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Edificio</label>
              <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="all">Todos</option>
                {buildings?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

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
                {!isAgent && <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Proveedor</th>}
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Prioridad</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-6 py-4">Estado</th>
                {!isAgent && <th className="text-right text-xs font-medium text-muted-foreground uppercase px-6 py-4">Acciones</th>}
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
                    {!isAgent && <td className="px-6 py-4 text-sm text-muted-foreground">{(ticket as any).providers?.name || '-'}</td>}
                    <td className="px-6 py-4"><span className={`badge-status text-xs ${pc.class}`}>{pc.label}</span></td>
                    <td className="px-6 py-4"><span className={`badge-status text-xs border ${sc.class}`}>{sc.label}</span></td>
                    {!isAgent && (
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="p-2 hover:bg-muted rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ticket.status === 'open' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'in_progress' })}>Marcar En Progreso</DropdownMenuItem>}
                          {ticket.status === 'in_progress' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'completed' })}>Marcar Completado</DropdownMenuItem>}
                          {(ticket.status === 'cancelled' || ticket.status === 'completed') && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'open' })}>Reabrir</DropdownMenuItem>}
                          {ticket.status !== 'cancelled' && ticket.status !== 'completed' && <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ticket.id, status: 'cancelled' })} className="text-destructive">Cancelar</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    )}
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
            <div><label className="block text-sm font-medium mb-1">Filtrar por Propietario</label>
              <select value={formOwnerFilter} onChange={e => { setFormOwnerFilter(e.target.value); setForm(f => ({ ...f, property_id: '' })); }} className="input-field">
                <option value="all">Todos los propietarios</option>
                {owners?.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium mb-1">Propiedad *</label>
              {(() => {
                const filteredProps = (properties || []).filter(p => formOwnerFilter === 'all' || p.owner_id === formOwnerFilter);
                return (
                  <>
                    <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="input-field" required>
                      <option value="">Seleccionar...</option>
                      {filteredProps.map(p => <option key={p.id} value={p.id}>{p.property_code} - {p.title}</option>)}
                    </select>
                    {formOwnerFilter !== 'all' && filteredProps.length === 0 && (
                      <p className="text-xs text-warning mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Este propietario no tiene propiedades vinculadas. Asigná el propietario en la ficha de cada propiedad.
                      </p>
                    )}
                  </>
                );
              })()}</div>
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
