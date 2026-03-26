import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientRequests, useCreateClientRequest, useUpdateClientRequest, useDeleteClientRequest, type ClientRequest } from '@/hooks/useClientRequests';
import { useAgents } from '@/hooks/useAgents';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Search, StickyNote, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const urgencyColors: Record<string, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/30',
  media: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  baja: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600' },
  en_proceso: { label: 'En proceso', color: 'bg-blue-500/10 text-blue-600' },
  completado: { label: 'Completado', color: 'bg-green-500/10 text-green-600' },
  cancelado: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
};

const ClientRequestsPage = () => {
  const { user, role } = useAuth();
  const { data: requests = [], isLoading } = useClientRequests();
  const { data: agents = [] } = useAgents();
  const createReq = useCreateClientRequest();
  const updateReq = useUpdateClientRequest();
  const deleteReq = useDeleteClientRequest();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientRequest | null>(null);
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({
    description: '',
    request_type: 'alquiler',
    urgency: 'media',
    agent_id: '',
  });

  const isAgent = role === 'agent';

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.description.toLowerCase().includes(s) && !(r.agent_name || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [requests, filterUrgency, filterStatus, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ description: '', request_type: 'alquiler', urgency: 'media', agent_id: isAgent ? user!.id : '' });
    setShowForm(true);
  };

  const openEdit = (r: ClientRequest) => {
    setEditing(r);
    setForm({ description: r.description, request_type: r.request_type, urgency: r.urgency, agent_id: r.agent_id });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    const agentId = form.agent_id || user!.id;
    if (editing) {
      await updateReq.mutateAsync({ id: editing.id, description: form.description, request_type: form.request_type, urgency: form.urgency, agent_id: agentId });
    } else {
      await createReq.mutateAsync({ description: form.description, request_type: form.request_type, urgency: form.urgency, agent_id: agentId, created_by: user!.id });
    }
    setShowForm(false);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateReq.mutate({ id, status });
  };

  return (
    <MainLayout title="Pedidos de Clientes" subtitle="Bloc de notas para organizar la demanda" action={{ label: 'Nuevo pedido', onClick: openNew }}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas urgencias</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['pendiente', 'en_proceso', 'completado', 'cancelado'] as const).map(s => {
            const count = requests.filter(r => r.status === s).length;
            const cfg = statusLabels[s];
            return (
              <Card key={s} className="cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <StickyNote className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay pedidos registrados</p>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Agregar pedido</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <Card key={r.id} className={`border-l-4 ${urgencyColors[r.urgency] || ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{r.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">{r.request_type === 'compra' ? '🏷 Compra' : '🔑 Alquiler'}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${statusLabels[r.status]?.color || ''}`}>
                          {statusLabels[r.status]?.label || r.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {r.urgency === 'alta' ? '🔴' : r.urgency === 'media' ? '🟡' : '🟢'} {r.urgency}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">· {r.agent_name}</span>
                        <span className="text-[10px] text-muted-foreground">· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Select value={r.status} onValueChange={v => handleStatusChange(r.id, v)}>
                        <SelectTrigger className="h-7 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_proceso">En proceso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReq.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar pedido' : 'Nuevo pedido de cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Descripción *</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder='Ej: "Depto en alquiler zona centro, 3 hab, cochera, hasta Gs. 5.000.000"' rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Tipo</label>
                <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alquiler">🔑 Alquiler</SelectItem>
                    <SelectItem value="compra">🏷 Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Urgencia</label>
                <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="baja">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isAgent && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Asesor</label>
                <Select value={form.agent_id} onValueChange={v => setForm(f => ({ ...f, agent_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar asesor" /></SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.status === 'active').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.description.trim() || createReq.isPending || updateReq.isPending}>
              {editing ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ClientRequestsPage;
