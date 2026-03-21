import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { OwnerFormDialog } from '@/components/owners/OwnerFormDialog';
import { OwnerStatementDialog } from '@/components/owners/OwnerStatementDialog';
import { useOwners, useDeleteOwner, Owner } from '@/hooks/useOwners';
import { useAuth } from '@/contexts/AuthContext';
import { useAgents } from '@/hooks/useAgents';
import { Badge } from '@/components/ui/badge';
import {
  Search, Mail, Phone, MapPin, Pencil, Trash2, Loader2,
  FileText, UserCheck, AlertCircle, ReceiptText, Building2, Users,
  LayoutGrid, List,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const VIEW_KEY = 'propietarios_vista_preferida';

const OwnersPage = () => {
  const { data: owners, isLoading } = useOwners();
  const { user, role, isAdmin } = useAuth();
  const deleteMutation = useDeleteOwner();
  const navigate = useNavigate();
  const { data: agents } = useAgents();
  const showAgentFilter = isAdmin || role === 'accounting' || role === 'secretaria' || role === 'superadmin';

  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [deleteOwner, setDeleteOwner] = useState<Owner | null>(null);
  const [statementOwner, setStatementOwner] = useState<Owner | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid');

  const toggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  };

  // Fetch property counts per owner
  const { data: propertyCounts } = useQuery({
    queryKey: ['owner-property-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('owner_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(p => {
        if (p.owner_id) {
          counts[p.owner_id] = (counts[p.owner_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user,
  });

  // Get unique agent list from owners for the filter
  const agentOptions = (() => {
    if (!owners) return [];
    const map = new Map<string, string>();
    owners.forEach(o => {
      if (o.agente_id && o.agente_nombre) {
        map.set(o.agente_id, o.agente_nombre);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const filtered = (owners ?? []).filter(o => {
    const matchesSearch =
      o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.document_number ?? '').includes(searchTerm);
    const matchesAgent = !agentFilter || o.agente_id === agentFilter;
    return matchesSearch && matchesAgent;
  });

  const handleEdit = (o: Owner) => {
    setEditOwner(o);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditOwner(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteOwner) return;
    await deleteMutation.mutateAsync(deleteOwner.id);
    setDeleteOwner(null);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <MainLayout
      title="Propietarios"
      subtitle={`${filtered.length} propietario${filtered.length !== 1 ? 's' : ''} registrado${filtered.length !== 1 ? 's' : ''}`}
      action={{ label: '+ Nuevo Propietario', onClick: handleNew }}
    >
      {/* Search + Agent Filter + View Toggle */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        {showAgentFilter && agentOptions.length > 0 && (
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los agentes</option>
            {agentOptions.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center border border-input rounded-lg overflow-hidden">
          <button
            onClick={() => toggleView('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            title="Vista grilla"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleView('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            title="Vista lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((owner, idx) => {
            const initials = getInitials(owner.full_name);
            return (
              <div
                key={owner.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all duration-200 animate-scale-in opacity-0 group cursor-pointer"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'forwards' }}
                onClick={() => navigate(`/propietarios/${owner.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground leading-tight">{owner.full_name}</h3>
                      {owner.document_number && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {owner.document_type || 'CI'}: {owner.document_number}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setStatementOwner(owner)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      title="Estado de Cuenta"
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Estado de Cuenta</span>
                    </button>
                    <button
                      onClick={() => handleEdit(owner)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteOwner(owner)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Agent badge (admin only) */}
                {showAgentFilter && owner.agente_nombre && (
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="w-3 h-3" />
                      {owner.agente_nombre}
                    </Badge>
                  </div>
                )}

                {/* Contact info */}
                <div className="space-y-2">
                  {owner.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                  {owner.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{owner.address}</span>
                    </div>
                  )}
                </div>

                {/* Property count badge */}
                {propertyCounts && propertyCounts[owner.id] > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {propertyCounts[owner.id]} propiedad{propertyCounts[owner.id] !== 1 ? 'es' : ''}
                    </span>
                  </div>
                )}

                {owner.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground line-clamp-2">{owner.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && filtered.length > 0 && viewMode === 'list' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Documento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  {showAgentFilter && <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Agente</th>}
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Propiedades</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(owner => {
                  const initials = getInitials(owner.full_name);
                  const propCount = propertyCounts?.[owner.id] || 0;
                  return (
                    <tr
                      key={owner.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/propietarios/${owner.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{initials}</span>
                          </div>
                          <span className="font-medium text-foreground">{owner.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {owner.document_number ? `${owner.document_type || 'CI'}: ${owner.document_number}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {owner.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                        {owner.email || '—'}
                      </td>
                      {showAgentFilter && (
                        <td className="px-4 py-3 hidden md:table-cell">
                          {owner.agente_nombre ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Users className="w-3 h-3" />
                              {owner.agente_nombre}
                            </Badge>
                          ) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        {propCount > 0 ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Building2 className="w-3 h-3" />
                            {propCount}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setStatementOwner(owner)}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Estado de Cuenta"
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(owner)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteOwner(owner)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchTerm || agentFilter ? 'No se encontraron propietarios' : 'Sin propietarios registrados'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {searchTerm || agentFilter
              ? 'Intentá ajustar la búsqueda o el filtro'
              : 'Agregá propietarios para asociarlos a propiedades y contratos'}
          </p>
          {!searchTerm && !agentFilter && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Agregar primer propietario
            </button>
          )}
        </div>
      )}

      {/* Form dialog */}
      <OwnerFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditOwner(null); }}
        owner={editOwner}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteOwner} onOpenChange={v => { if (!v) setDeleteOwner(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Eliminar propietario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteOwner?.full_name}</strong>?
              Esta acción no se puede deshacer. Las propiedades asociadas quedarán sin propietario asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Owner statement dialog */}
      <OwnerStatementDialog
        open={!!statementOwner}
        onOpenChange={v => { if (!v) setStatementOwner(null); }}
        owner={statementOwner}
      />

    </MainLayout>
  );
};

export default OwnersPage;
