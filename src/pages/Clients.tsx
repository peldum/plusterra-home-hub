import { useState, useMemo } from 'react';
import { ModuleGuide } from '@/components/layout/ModuleGuide';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientCardView } from '@/components/clients/ClientCardView';
import { ClientListView } from '@/components/clients/ClientListView';
import { useClients, useDeleteClient, type UnifiedClient } from '@/hooks/useClients';
import { useAgentSoftLock } from '@/hooks/useAgentSoftLock';
import { useClientFinancialStatus, type FinancialStatus } from '@/hooks/useClientFinancialStatus';
import { SoftLockBanner } from '@/components/softlock/SoftLockBanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DisplayClient } from '@/components/clients/clientTypes';
import {
  Search,
  Loader2,
  LayoutGrid,
  List,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('clients_view_mode') as 'grid' | 'list') || 'grid';
  });
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<{ id: string; full_name: string; email?: string; phone?: string; birth_date?: string; client_type?: string; notes?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DisplayClient | null>(null);

  const { data: dbClients, isLoading } = useClients();
  const { isLocked } = useAgentSoftLock();
  const { data: financialMap } = useClientFinancialStatus();
  const deleteMutation = useDeleteClient();

  const toggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('clients_view_mode', mode);
  };

  // Only show inquilinos (tenants)
  const displayClients: DisplayClient[] = useMemo(() => {
    return (dbClients || [])
      .filter((c: UnifiedClient) => {
        // From contracts: always inquilino
        if (c.source === 'contract') return true;
        // From clients table: only if type is inquilino
        return c.client_type === 'inquilino';
      })
      .map((c: UnifiedClient) => {
        const fin = financialMap?.get(c.id);
        const paymentStatus: FinancialStatus = fin?.status || 'na';

        return {
          id: c.id,
          name: c.full_name,
          email: c.email || '',
          phone: c.phone || '',
          type: 'Inquilino',
          property: c.property_title || c.address || '—',
          paymentStatus,
          avatar: c.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
          source: c.source,
          monthlyRent: c.monthly_rent,
          currency: c.currency,
          startDate: c.start_date,
          endDate: c.end_date,
          buildingId: c.building_id,
          buildingName: c.building_name,
          contractId: c.contract_id || null,
        };
      });
  }, [dbClients, financialMap]);

  const buildings = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of displayClients) {
      if (c.buildingId && c.buildingName) map.set(c.buildingId, c.buildingName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [displayClients]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return displayClients.filter((client) => {
      const matchesSearch = !term || client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.phone.replace(/\s/g, '').includes(term.replace(/\s/g, ''));
      const matchesBuilding = selectedBuilding === 'all' || client.buildingId === selectedBuilding;
      return matchesSearch && matchesBuilding;
    });
  }, [displayClients, searchTerm, selectedBuilding]);

  const handleEdit = (client: DisplayClient) => {
    const raw = dbClients?.find(c => c.id === client.id);
    if (!raw || raw.source !== 'clients') return;
    setEditingClient({
      id: raw.id,
      full_name: raw.full_name,
      email: raw.email || '',
      phone: raw.phone || '',
      client_type: raw.client_type || 'inquilino',
    });
    setClientFormOpen(true);
  };

  const handleDelete = (client: DisplayClient) => {
    setDeleteConfirm(client);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <MainLayout
      title="Inquilinos"
      subtitle={`${filteredClients.length} inquilinos registrados`}
      action={isLocked ? undefined : {
        label: 'Nuevo Inquilino',
        onClick: () => { setEditingClient(null); setClientFormOpen(true); },
      }}
    >
      <ModuleGuide
        moduleKey="clients"
        tips={[
          'Aquí aparecen los inquilinos de las propiedades que administrás.',
          'Los inquilinos de contratos activos en edificios aparecen automáticamente.',
          'El semáforo de pago (🟢🟡🔴) indica el estado financiero de cada inquilino.',
          'Filtrá por edificio para ver los inquilinos de cada propiedad.',
        ]}
      />
      <SoftLockBanner />
      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm font-medium">
          🔒 Cuenta con pagos pendientes. Para continuar, regularice su canon mensual.
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {buildings.length > 0 && (
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-full sm:w-[220px] h-10">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos los edificios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los edificios</SelectItem>
              {buildings.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View mode toggle */}
        <TooltipProvider>
          <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden ml-auto shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleView('grid')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Vista cuadrícula</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleView('list')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Vista lista</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredClients.length > 0 && (
        viewMode === 'grid'
          ? <ClientCardView clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} />
          : <ClientListView clients={filteredClients} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron inquilinos</h3>
          <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} editData={editingClient} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminar inquilino
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteConfirm?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Clients;
